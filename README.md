![Moleculer logo](https://moleculer.services/images/banner.png)

# procfs

Moleculer agent that collects system stats

# Features
- CPU, Memory, NIC...

# Install

```bash
$ git clone https://github.com/PaaS-Shack/procfs.git
$ cd procfs
$ npm i
```

# Usage

```js
"use strict";

const { ServiceBroker } = require("moleculer");


const broker = new ServiceBroker();


broker.start()

// Get node hearbeat
.then(() => broker.call("v1.procfs.stats", {}))

```

# Settings

| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |


# Actions

## `v1.procfs.stats`

Detailed infomation about the node.

### Parameters
| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |

### Results
**Type:** `<Object>`
