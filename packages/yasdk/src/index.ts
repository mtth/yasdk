import {assert} from '@opvious/stl-errors';
import {Command} from 'commander';
import {mkdir, readFile, writeFile} from 'fs/promises';
import generateTypes from 'openapi-typescript';
import path from 'path';
import {
  loadOpenapiDocument,
  OpenapiDocuments,
  RefResolver,
} from 'yasdk-openapi';

const COMMAND_NAME = 'yasdk';

const preambleUrl = new URL(
  '../resources/preamble/index.gen.ts',
  import.meta.url
);

export function mainCommand(): Command {
  return new Command()
    .name(COMMAND_NAME)
    .description('Generate typed OpenAPI SDK')
    .requiredOption('-i, --input <path>', 'OpenAPI spec')
    .requiredOption('-o, --output <path>', 'TypeScript output file')
    .action(async (opts) => {
      const doc = await loadOpenapiDocument(opts.input, {
        versions: ['3.0', '3.1'],
        resolveAllReferences: true,
      });
      const [typesStr, preambleStr, valuesStr] = await Promise.all([
        generateTypes(doc, {
          commentHeader: '',
          immutableTypes: true,
        }),
        readFile(preambleUrl, 'utf8'),
        generateValues(doc),
      ]);
      const out = [
        '// No not edit, this file was auto-generated\n',
        preambleStr,
        typesStr
          .replace(/ ([2345])XX:\s+{/g, ' \'$1XX\': {')
          .replace(/export /g, ''),
        valuesStr,
      ].join('\n');
      await mkdir(path.dirname(opts.output), {recursive: true});
      await writeFile(opts.output, out, 'utf8');
    });
}

const methods = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
] as const;

async function generateValues(
  doc: OpenapiDocuments['3.0' | '3.1']
): Promise<string> {
  const ops: any = {};
  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    for (const method of methods) {
      const op = item?.[method];
      if (!op?.operationId) {
        continue;
      }
      const codes: Record<string, string[]> = {};
      for (const [code, res] of Object.entries(op.responses)) {
        assert(!('$ref' in res), 'Unexpected reference', res);
        codes[code] = Object.keys(res.content ?? {});
      }
      const parameters: Record<string, string> = {};
      for (const param of op.parameters ?? []) {
        assert(!('$ref' in param), 'Unexpected reference', param);
        parameters[param.name] = param.in;
      }
      ops[op?.operationId] = {path, method, codes, parameters};
    }
  }
  let out = `const allOperations = ${JSON.stringify(ops, null, 2)} as const;`;
  out += SUFFIX;
  return out;
}

const SUFFIX = `

export type {
  BaseFetch,
  Coercer,
  CoercerContext,
  Decoder,
  DecoderContext,
  Encoder,
  EncoderContext,
  ResponseCode,
  operations,
};

export type types = components['schemas'];

export type RequestBody<
  K extends keyof operations,
  M extends MimeType = typeof JSON_MIME_TYPE
> = RequestBodyFor<operations[K], M>;

export type RequestParameters<
  K extends keyof operations
> = RequestParametersFor<operations[K]>;

export type ResponseData<
  K extends keyof operations,
  C extends keyof operations[K]['responses'] = keyof operations[K]['responses'],
  M extends MimeType = typeof JSON_MIME_TYPE
> = ResponseDataFor<operations[K], C, M>;

export type CreateSdkOptions<
  F extends BaseFetch = typeof fetch,
  M extends string = typeof JSON_MIME_TYPE
> = CreateSdkOptionsFor<operations, F, M>;

export type Sdk<
  F extends BaseFetch = typeof fetch,
  M extends string = typeof JSON_MIME_TYPE
> = SdkFor<operations, F, M>;

export function createSdk<
  F extends BaseFetch = typeof fetch,
  M extends string = typeof JSON_MIME_TYPE
>(
  url: string | URL,
  opts?: CreateSdkOptions<F, M>
): SdkFor<operations, F, M> {
  return createSdkFor<operations, F, M>(allOperations, url, opts);
}
`;
