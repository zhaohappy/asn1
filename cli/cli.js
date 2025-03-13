#!/usr/bin/env node

const { program } = require("commander");
const { parse, stringify } = require("../dist/asn1.umd");
const fs = require('fs');
const path = require('path');

program
  .version("1.0.0")
  .description("asn syntax file transform cli tool")
  .requiredOption("-i, --input <input>", "input asn syntax file")
  .requiredOption("-o, --output <output>", "output defined ts file")
  .action((options) => {
    const now = process.cwd();
    const input = path.isAbsolute(options.input) ? options.input : path.resolve(now, options.input);
    const output = path.isAbsolute(options.output) ? options.output : path.resolve(now, options.output);

    const nodes = parse(fs.readFileSync(input, 'utf-8'));
    const result = stringify(nodes);
    if (!fs.existsSync(path.dirname(output))) {
      fs.mkdirSync(path.dirname(output), { recursive: true });
    }
    fs.writeFileSync(output, result);
  });

program.parse(process.argv);
