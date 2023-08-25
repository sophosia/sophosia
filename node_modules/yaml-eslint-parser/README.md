# yaml-eslint-parser

A YAML parser that produces output [compatible with ESLint](https://eslint.org/docs/developer-guide/working-with-custom-parsers#all-nodes).

*This parser is backed by excellent [yaml](https://github.com/eemeli/yaml) package and it is heavily inspired by [yaml-unist-parser](https://github.com/ikatyang/yaml-unist-parser) package.*

[![NPM license](https://img.shields.io/npm/l/yaml-eslint-parser.svg)](https://www.npmjs.com/package/yaml-eslint-parser)
[![NPM version](https://img.shields.io/npm/v/yaml-eslint-parser.svg)](https://www.npmjs.com/package/yaml-eslint-parser)
[![NPM downloads](https://img.shields.io/badge/dynamic/json.svg?label=downloads&colorB=green&suffix=/day&query=$.downloads&uri=https://api.npmjs.org//downloads/point/last-day/yaml-eslint-parser&maxAge=3600)](http://www.npmtrends.com/yaml-eslint-parser)
[![NPM downloads](https://img.shields.io/npm/dw/yaml-eslint-parser.svg)](http://www.npmtrends.com/yaml-eslint-parser)
[![NPM downloads](https://img.shields.io/npm/dm/yaml-eslint-parser.svg)](http://www.npmtrends.com/yaml-eslint-parser)
[![NPM downloads](https://img.shields.io/npm/dy/yaml-eslint-parser.svg)](http://www.npmtrends.com/yaml-eslint-parser)
[![NPM downloads](https://img.shields.io/npm/dt/yaml-eslint-parser.svg)](http://www.npmtrends.com/yaml-eslint-parser)
[![Build Status](https://github.com/ota-meshi/yaml-eslint-parser/workflows/CI/badge.svg?branch=master)](https://github.com/ota-meshi/yaml-eslint-parser/actions?query=workflow%3ACI)
[![Coverage Status](https://coveralls.io/repos/github/ota-meshi/yaml-eslint-parser/badge.svg?branch=master)](https://coveralls.io/github/ota-meshi/yaml-eslint-parser?branch=master)

## Installation

```bash
npm install --save-dev yaml-eslint-parser
```

## Usage

### Configuration

Use `.eslintrc.*` file to configure parser. See also: [https://eslint.org/docs/user-guide/configuring](https://eslint.org/docs/user-guide/configuring).

Example **.eslintrc.js**:

```js
module.exports = {
    "overrides": [
        {
            "files": ["*.yaml", "*.yml"],
            "parser": "yaml-eslint-parser"
        }
    ]
}
```

## Usage for Custom Rules / Plugins

- [AST.md](./docs/AST.md) is AST specification.
- [block-mapping.ts](https://github.com/ota-meshi/eslint-plugin-yml/blob/master/src/rules/block-mapping.ts) is an example.
- You can see the AST on the [Online DEMO](https://ota-meshi.github.io/yaml-eslint-parser/).
