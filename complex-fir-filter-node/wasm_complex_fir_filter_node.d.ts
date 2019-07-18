/* tslint:disable */
/**
*/
export class ComplexFirFilterKernel {
  free(): void;
/**
* @returns {ComplexFirFilterKernel} 
*/
  constructor();
/**
* @param {Float32Array} coeffs_ 
*/
  set_coeffs(coeffs_: Float32Array): void;
/**
* @param {Float32Array} input_ 
* @param {Float32Array} output_ 
*/
  process(input_: Float32Array, output_: Float32Array): void;
}

/**
* If `module_or_path` is {RequestInfo}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {RequestInfo | BufferSource | WebAssembly.Module} module_or_path
*
* @returns {Promise<any>}
*/
export default function init (module_or_path?: RequestInfo | BufferSource | WebAssembly.Module): Promise<any>;
        