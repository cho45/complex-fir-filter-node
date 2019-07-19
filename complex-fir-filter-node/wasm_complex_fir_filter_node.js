
let wasm;

let cachegetFloat32Memory = null;
function getFloat32Memory() {
    if (cachegetFloat32Memory === null || cachegetFloat32Memory.buffer !== wasm.memory.buffer) {
        cachegetFloat32Memory = new Float32Array(wasm.memory.buffer);
    }
    return cachegetFloat32Memory;
}

let WASM_VECTOR_LEN = 0;

function passArrayF32ToWasm(arg) {
    const ptr = wasm.__wbindgen_malloc(arg.length * 4);
    getFloat32Memory().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8');

let cachegetUint8Memory = null;
function getUint8Memory() {
    if (cachegetUint8Memory === null || cachegetUint8Memory.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory;
}

function getStringFromWasm(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory().subarray(ptr, ptr + len));
}
/**
*/
export class ComplexFirFilterKernel {

    static __wrap(ptr) {
        const obj = Object.create(ComplexFirFilterKernel.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_complexfirfilterkernel_free(ptr);
    }
    /**
    * @returns {ComplexFirFilterKernel}
    */
    constructor() {
        const ret = wasm.complexfirfilterkernel_new();
        return ComplexFirFilterKernel.__wrap(ret);
    }
    /**
    * @param {Float32Array} coeffs_
    */
    set_coeffs(coeffs_) {
        wasm.complexfirfilterkernel_set_coeffs(this.ptr, passArrayF32ToWasm(coeffs_), WASM_VECTOR_LEN);
    }
    /**
    * @param {Float32Array} input_
    * @param {Float32Array} output_
    */
    process(input_, output_) {
        const ptr0 = passArrayF32ToWasm(input_);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF32ToWasm(output_);
        const len1 = WASM_VECTOR_LEN;
        try {
            wasm.complexfirfilterkernel_process(this.ptr, ptr0, len0, ptr1, len1);
        } finally {
            input_.set(getFloat32Memory().subarray(ptr0 / 4, ptr0 / 4 + len0));
            wasm.__wbindgen_free(ptr0, len0 * 4);
            output_.set(getFloat32Memory().subarray(ptr1 / 4, ptr1 / 4 + len1));
            wasm.__wbindgen_free(ptr1, len1 * 4);
        }
    }
}

function init(module) {
    if (typeof module === 'undefined') {
        module = import.meta.url.replace(/\.js$/, '_bg.wasm');
    }
    let result;
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_log_42521633f91221e3 = function(arg0, arg1) {
        console.log(getStringFromWasm(arg0, arg1));
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm(arg0, arg1));
    };

    if (module instanceof URL || typeof module === 'string' || module instanceof Request) {

        const response = fetch(module);
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            result = WebAssembly.instantiateStreaming(response, imports)
            .catch(e => {
                console.warn("`WebAssembly.instantiateStreaming` failed. Assuming this is because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
                return response
                .then(r => r.arrayBuffer())
                .then(bytes => WebAssembly.instantiate(bytes, imports));
            });
        } else {
            result = response
            .then(r => r.arrayBuffer())
            .then(bytes => WebAssembly.instantiate(bytes, imports));
        }
    } else {

        result = WebAssembly.instantiate(module, imports)
        .then(result => {
            if (result instanceof WebAssembly.Instance) {
                return { instance: result, module };
            } else {
                return result;
            }
        });
    }
    return result.then(({instance, module}) => {
        wasm = instance.exports;
        init.__wbindgen_wasm_module = module;

        return wasm;
    });
}

export default init;

