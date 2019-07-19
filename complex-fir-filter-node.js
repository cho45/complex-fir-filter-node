export class ComplexFirFilterNode extends AudioWorkletNode {
	set coeffs(val) {
		this.port.postMessage({
			id: 0,
			method: 'setCoeffs',
			params: { coeffs: val }
		});
	}

	constructor(context, opts) {
		if (!opts) opts = {};

		super(context, 'complex-fir-filter-processor', {
			numberOfInputs: 1,
			numberOfOutputs: 1,
			channelCount: 2,
			channelCountMode: "explicit",
			channelInterpretation: "discrete",
			outputChannelCount: [2],
			processorOptions: {
				coeffs: opts.coeffs
			}
		});
		this.port.postMessage({
			id: 0,
			method: 'init',
			params: { module: this.constructor.module }
		});

	}
	static async loadWasm() {
		const base = import.meta.url.replace(/\.js$/, '/');
		const wasm = base + "wasm_complex_fir_filter_node_bg.wasm";

		console.log('compiling wasm module', wasm);
		this.module = await WebAssembly.compile(await (await fetch(wasm)).arrayBuffer())
		console.log('load wasm bridge', this.module);
	}

	static async addModule(context) {
		const processor = (() => {
			// AudioWorkletGlobalScope
			class ComplexFirFilterProcessor extends AudioWorkletProcessor {
				constructor(opts) {
					super();
					this.coeffs = opts.processorOptions.coeffs;

					this.port.onmessage = async (e) => {
						console.log(e);
						const { method, params, id }  = e.data;
						const f = this['call_' + method];
						if (f) {
							const result = await f.call(this, params);
							this.port.postMessage({ id, result });
						} else {
							throw `no such method ${method}`
						}
					};
				}

				async call_init(params) {
					const { module } = params;

					const imports = {};
					imports.wbg = {};
					imports.wbg.__wbg_log_42521633f91221e3 = (arg0, arg1) => {
						const chars = new Uint8Array(this.wasm.memory.buffer).subarray(arg0, arg0 + arg1);
						const str = String.fromCharCode(...chars);
						console.log(str);
					};
					imports.wbg.__wbindgen_throw = (arg0, arg1) => {
						const chars = new Uint8Array(this.wasm.memory.buffer).subarray(arg0, arg0 + arg1);
						throw String.fromCharCode(...chars);
					};

					const instance = await WebAssembly.instantiate(module, imports);
					console.log('instantiate', instance);

					this.wasm = instance.exports;
					console.log('initialized module', this.wasm);
					this.kernelPtr = this.wasm.complexfirfilterkernel_new();
					if (this.coeffs.length) {
						this.call_setCoeffs({ coeffs: this.coeffs });
					}
				}

				call_setCoeffs(params) {
					const coeffs = params.coeffs;
					if (!coeffs) throw "coeffs must be not null";
					this.coeffs = coeffs;

					this.coeffsBuf = this.typedMalloc(Float32Array, coeffs.length);
					this.coeffsBuf.array.set(this.coeffs, 0);
					this.wasm.complexfirfilterkernel_set_coeffs(this.kernelPtr, this.coeffsBuf.ptr, this.coeffsBuf.len);
				}

				process(inputs, outputs, _parameters) {
					const input  = inputs[0];
					const output = outputs[0];
					const length = input[0].length;

					if (!this.in_) {
						this.in_ = this.typedMalloc(Float32Array, length * 2);
					} else {
						if (this.in_.len !== length * 2) {
							this.in_.free();
							this.in_ = this.typedMalloc(Float32Array, length * 2);
						}
					}

					if (!this.out) {
						this.out = this.typedMalloc(Float32Array, length * 2);
					} else {
						if (this.out.len !== length * 2) {
							this.out.free();
							this.out = this.typedMalloc(Float32Array, length * 2);
						}
					}

					const in_ = this.in_;
					for (let i = 0, ina = in_.array; i < length; i++) {
						ina[i*2+0] = input[0][i];
						ina[i*2+1] = input[1][i];
					}

					const out = this.out;
					this.wasm.complexfirfilterkernel_process(this.kernelPtr, in_.ptr, in_.len, out.ptr, out.len);
					for (let i = 0, oua = out.array; i < length; i++) {
						output[0][i] = oua[i*2+0];
						output[1][i] = oua[i*2+1];
					}

					return true;
				}

				typedMalloc(constructor, length) {
					if (!this.wasm) return;
					const bytes = length * constructor.BYTES_PER_ELEMENT;
					const wasm = this.wasm;
					let ptr = this.wasm.__wbindgen_malloc(bytes);
					return {
						ptr: ptr,
						byteLength: bytes,
						len: length,
						get array() {
							if (ptr !== 0) {
								return new constructor(wasm.memory.buffer, ptr, length);
							}
						},
						free() {
							wasm.__wbindgen_free(ptr, bytes);
							ptr = 0;
						}
					};
				}
			}

			registerProcessor('complex-fir-filter-processor', ComplexFirFilterProcessor);
		}).toString();

		const url = URL.createObjectURL(new Blob(['(', processor, ')()'], { type: 'application/javascript' }));
		return Promise.all([
			context.audioWorklet.addModule(url),
			this.loadWasm(),
		]);
	}

	static calculateBandpassCoeffs(ntaps, samplingFreq, lFreq, hFreq, windowFunction) {
		function lowpassPrototype (ntaps, samplingFreq, cutoffFreq, windowFunction) {
			const coeffs = new Float32Array(ntaps);
			const window = new Float32Array(ntaps);
			for (let n = 0; n < ntaps; n++) {
				window[n] = windowFunction(n / ntaps);
			}


			const half = (ntaps - 1) / 2;
			const omega = 2 * Math.PI * cutoffFreq / samplingFreq;
			for (let n = -half; n < half; n++) {
				const i = half + n;
				if (n === 0) {
					coeffs[i] = omega / Math.PI * window[i];
				}
				else {
					coeffs[i] = Math.sin(omega * n) / (n * Math.PI) * window[i];
				}
			}
			return coeffs;
		}

		const bandWidth = hFreq - lFreq;

		const proto = lowpassPrototype(
			ntaps,
			samplingFreq,
			bandWidth / 2,
			windowFunction
		);

		const centerFreq = (lFreq + bandWidth / 2) / samplingFreq;
		console.log({centerFreq, bandWidth, lFreq, hFreq});

		// complex
		const coeffs = new Float32Array(ntaps * 2);

		// shift 0Hz to centerFreq
		for (let n = 0; n < ntaps; n++) {
			const theta = 2 * Math.PI * centerFreq * n;
			coeffs[n*2+0] = proto[n] * Math.cos(theta);
			coeffs[n*2+1] = proto[n] * Math.sin(theta);
		}

		return coeffs;
	}
}

