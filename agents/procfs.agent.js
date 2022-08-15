"use strict";

const { MoleculerClientError, MoleculerRetryableError } = require("moleculer").Errors;

const fs = require('fs')
const { readFile } = require('fs/promises');
const wcmatch = require('wildcard-match')
const Aggregator = require('../lib/aggregator')



const metricsDefinition = {
    'net.*.rxBytes': {
        calcDiff: true,
        agg: 'sum'
    },
    'net.*.rxPackets': {
        calcDiff: true,
        agg: 'sum'
    },
    'net.*.rxErrors': {
        calcDiff: true,
        agg: 'sum'
    },
    'net.*.txBytes': {
        calcDiff: true,
        agg: 'sum'
    },
    'net.*.txPackets': {
        calcDiff: true,
        agg: 'sum'
    },
    'net.*.txErrors': {
        calcDiff: true,
        agg: 'sum'
    },

    'memory.memTotal': {
        calcDiff: false,
        agg: 'mean'
    },
    'memory.memFree': {
        calcDiff: false,
        agg: 'mean'
    },
    'memory.memAvailable': {
        calcDiff: false,
        agg: 'mean'
    },
    'memory.buffers': {
        calcDiff: false,
        agg: 'mean'
    },
    'memory.cached': {
        calcDiff: false,
        agg: 'mean'
    },
    'memory.swapTotal': {
        calcDiff: false,
        agg: 'mean'
    },
    'memory.swapFree': {
        calcDiff: false,
        agg: 'mean'
    },


    'cpu.*.MHz': {
        calcDiff: false,
        agg: 'mean'
    },
    'cpu.*.percentage': {
        calcDiff: false,
        agg: 'mean'
    },
    'cpu.*.user': {
        calcDiff: false,
        agg: 'mean'
    },
    'cpu.*.nice': {
        calcDiff: false,
        agg: 'mean'
    },
    'cpu.*.system': {
        calcDiff: false,
        agg: 'mean'
    },
    'cpu.*.idle': {
        calcDiff: false,
        agg: 'mean'
    },
    'cpu.*.iowait': {
        calcDiff: false,
        agg: 'mean'
    },
    'cpu.*.irq': {
        calcDiff: false,
        agg: 'mean'
    },
    'cpu.*.softirq': {
        calcDiff: false,
        agg: 'mean'
    },
    'cpu.*.steal': {
        calcDiff: false,
        agg: 'mean'
    },




    'disk.*.reads': {
        calcDiff: true,
        agg: 'sum'
    },
    'disk.*.writes': {
        calcDiff: true,
        agg: 'sum'
    },
    'disk.*.currentIoCount': {
        calcDiff: true,
        agg: 'sum'
    },
    'disk.*.readTime': {
        calcDiff: true,
        agg: 'sum'
    },
    'disk.*.writeTime': {
        calcDiff: true,
        agg: 'sum'

    },




}

const metricsDefinitionKeys = Object.keys(metricsDefinition)

for (let index = 0; index < metricsDefinitionKeys.length; index++) {
    const element = metricsDefinitionKeys[index];
    metricsDefinition[element].isMatch = wcmatch(element)
}
const store = {}
const lastValues = {}


module.exports = {
    name: "procfs",
    version: 1,

    /**
     * Default settings
     */
    settings: {

    },

    /**
     * Actions
     */
    actions: {
        first: {
            async handler(ctx) {
                const stat = {};
                await Promise.all([
                    this.cpu(stat),
                    this.memory(stat),
                    this.net(stat),
                    this.disk(stat)
                ])
                for (const [key, value] of Object.entries(stat)) {
                    // console.log(`${key}: ${value}`);
                    for (let index = 0; index < metricsDefinitionKeys.length; index++) {
                        const element = metricsDefinitionKeys[index];
                        if (metricsDefinition[element].isMatch(key)) {
                            store[key] = metricsDefinition[element];
                        }
                    }
                }
                return store
            }
        },
        stats: {
            async handler(ctx) {
                const stat = {};
                await Promise.all([
                    this.cpu(stat),
                    this.memory(stat),
                    this.net(stat),
                    this.disk(stat)
                ])
                return stat
            }
        },
        stat: {
            cache: false,
            params: {
                key: { type: "string", optional: true },
                match: { type: "boolean", default: false, optional: true },
                count: { type: "number", default: 0, optional: true },
            },
            permissions: ['teams.create'],
            auth: "required",
            async handler(ctx) {
                const { key, match, count } = Object.assign({}, ctx.params);
                if (!key) 
                    return this.agg.lastMetrics
                if (!match) 
                    return this.agg.lastMetrics[key];
                
                const found = {};
                const isMatch = wcmatch(key)
                for (const [_key, definition] of Object.entries(this.agg.lastMetrics)) {
                    if (isMatch(_key)) {
                        found[_key] = this.agg.lastMetrics[_key]
                    }
                }
                return found
            }
        },
    },

    /**
     * Methods
     */
    methods: {
        async read(stat) {
            const result = {};
            for (const [key, definition] of Object.entries(store)) {
                this.agg.get(key)
            }
            return this.agg
        },
        async process() {
            const stat = {};
            await Promise.all([
                this.cpu(stat),
                this.memory(stat),
                this.net(stat),
                this.disk(stat)
            ])
            return stat
        },
        async cpu(stat) {
            const [cpuinfo_file, stat_file] = await Promise.all([
                readFile(`/proc/cpuinfo`, { encoding: 'utf8', flag: 'r' }),
                readFile(`/proc/stat`, { encoding: 'utf8', flag: 'r' })
            ])

            const cpuLines = cpuinfo_file.replace(/\t/g, "bar").split('\n')
            let cpuIndex = 0;
            let cpus = 0
            for (let index = 0; index < cpuLines.length; index++) {
                const line = cpuLines[index];
                if (line.indexOf('processorbar:') == 0) {


                    cpus++;
                    cpuIndex = Number(line.split(' ')[1]);
                } else if (line.indexOf('cpu MHzbarbar:') == 0) {
                    stat[`cpu.${cpuIndex}.MHz`] = Number(line.split('cpu MHzbarbar:')[1])
                }
            }
            const cpuStatsLines = stat_file.split('\n')
            const rowHeaders = ['user',
                'nice',
                'system',
                'idle',
                'iowait',
                'irq',
                'softirq',
                'steal',
                'guest',
                'guestNice']
            for (let index = 1; index < cpus + 1; index++) {
                const line = cpuStatsLines[index];
                const row = line.split(' ')
                row.shift();
                for (let i = 0; i < rowHeaders.length; i++) {
                    const header = rowHeaders[i];
                    stat[`cpu.${index - 1}.${header}`] = Number(row[i])
                }
            }
            for (let index = 0; index < cpus; index++) {
                const Idle = stat[`cpu.${index}.iowait`] +
                    stat[`cpu.${index}.idle`]
                const NonIdle = stat[`cpu.${index}.user`] +
                    stat[`cpu.${index}.system`] +
                    stat[`cpu.${index}.irq`] +
                    stat[`cpu.${index}.softirq`] +
                    stat[`cpu.${index}.steal`];

                if (!this.cpuLast[index]) {
                    this.cpuLast[index] = {
                        Idle, NonIdle,
                        Total: Idle + NonIdle
                    }
                } else {
                    let PrevTotal = this.cpuLast[index].Idle + this.cpuLast[index].NonIdle
                    let Total = Idle + NonIdle

                    let totald = Total - this.cpuLast[index].Total
                    let idled = Idle - this.cpuLast[index].Idle

                    stat[`cpu.${index}.percentage`] = Number((((totald - idled) / totald) * 100).toFixed(2))
                    //console.log(`cpu.${index}.percentage`, stat[`cpu.${index}.percentage`])
                    this.cpuLast[index].Idle = Idle
                    this.cpuLast[index].NonIdle = NonIdle
                    this.cpuLast[index].Total = Total
                }
            }
            return stat
        },
        async memory(stat) {
            const [meminfo_file] = await Promise.all([
                readFile(`/proc/meminfo`, { encoding: 'utf8', flag: 'r' }),
            ])
            
            const memoryLines = meminfo_file.split('\n')
            for (let index = 0; index < memoryLines.length; index++) {
                const line = memoryLines[index];
                if (line == '') continue;
                const a = line.replace(/ /g, "").replace(/kB/g, "").split(':')
                //console.log(a)
                let key = a[0];
                let value = Number(a[1]);
                stat[`memory.${key[0].toLowerCase()}${key.substr(1)}`] = value
            }
            return stat
        },
        async net(stat) {
            const [netdev_file] = await Promise.all([
                readFile(`/proc/net/dev`, { encoding: 'utf8', flag: 'r' }),
            ])

            const devHeaders = ['rxBytes',
                'rxPackets',
                'rxErrors',
                'rxDrop',
                'rxFifo',
                'rxFrame',
                'rxCompressed',
                'rxMulticast',
                'txBytes',
                'txPackets',
                'txErrors',
                'txDrop',
                'txFifo',
                'txColls',
                'txCarrier',
                'txCompressed'];

            const netDevLines = netdev_file.split('\n')
            for (let index = 1; index < netDevLines.length; index++) {
                const line = netDevLines[index];

                const row = line.trim().replace(/:/g, "").split(/\s+/g)
                const name = row.shift()

                if (name == '' ||
                    name.indexOf('docker') == 0 ||
                    name.indexOf('veth') == 0 ||
                    name.indexOf('face') == 0 ||
                    name.indexOf('lo') == 0 ||
                    name.indexOf('wlx') == 0) {
                    continue;
                }

                for (let i = 0; i < devHeaders.length; i++) {
                    const header = devHeaders[i];
                    stat[`net.${name}.${header}`] = Number(row[i])
                }
            }
            return stat
        },
        async disk(stat) {
            const [diskstats_file] = await Promise.all([
                readFile(`/proc/diskstats`, { encoding: 'utf8', flag: 'r' }),
            ])

            const diskLineHeaderss = ['devId',
                'reads',
                'readsMerged',
                'sectorsRead',
                'readTime',
                'writes',
                'writesMerged',
                'sectorsWriten',
                'writeTime',
                'currentIoCount',
                'ioTime',
                'weightedIoTime'];

            const diskLines = diskstats_file.split('\n')

            for (let index = 0; index < diskLines.length; index++) {
                const line = diskLines[index];
                const row = line.replace(/:/g, "").split(/\s+/g)

                if (row.length == 0) continue;

                row.shift(); row.shift(); row.shift();

                const name = row.shift();

                if (!name || name == '' || name.indexOf('loop') == 0) continue;

                for (let i = 0; i < diskLineHeaderss.length; i++) {
                    const header = diskLineHeaderss[i];
                    stat[`disk.${name}.${header}`] = Number(row[i])
                }
            }
            return stat
        },
    },

    events: {

    },

    async stopped() {
        clearInterval(this.timer);

    },

    async started() {
        this.cpuLast = {}
        this.agg = new Aggregator();

        await this.cpu({})
        await this.actions.first()

        this.timer = setInterval(async () => {
            const stats=await this.process();
            this.broker.broadcast('procfs.stats', stats)
        }, 5000);
    }
};