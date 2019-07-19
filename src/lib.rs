extern crate wasm_bindgen;
extern crate num_complex;

//use std::sync::Arc;
//use std::mem;
use std::slice;
use std::f32;
use std::collections::VecDeque;
use num_complex::Complex;
use num_traits::Zero;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[allow(unused_macros)]
macro_rules! console_log {
    // Note that this is using the `log` function imported above during
    // `bare_bones`
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[wasm_bindgen]
pub struct ComplexFirFilterKernel {
    coeffs: Box<[Complex<f32>]>,
    hist: VecDeque<Complex<f32>>,
}

#[wasm_bindgen]
impl ComplexFirFilterKernel {
    #[allow(clippy::new_without_default)]
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let coeffs = vec![Complex::zero(); 0].into_boxed_slice();
        let hist = VecDeque::with_capacity(0);
        Self {
            coeffs,
            hist
        }
    }

    pub fn set_coeffs(&mut self, coeffs_: &[f32]) {
        let n = coeffs_.len() / 2;
        let coeffs = unsafe { slice::from_raw_parts_mut(coeffs_  as *const [f32] as *mut Complex<f32>, n ) };
        self.coeffs = vec![Complex::zero(); n].into_boxed_slice();
        self.hist.resize(n, Complex::zero());
        self.coeffs.copy_from_slice(coeffs);
        console_log!("set_coeffs {}, {}", n, self.coeffs.len());
    }

    #[inline]
    fn do_step(&mut self, num: Complex<f32>)-> Complex<f32> {
        let n = self.coeffs.len();
        if n == 0 {
            return num;
        }

        self.hist.pop_back();
        self.hist.push_front(num);

        let mut sum : Complex<f32> = Complex::zero();
        for i in 0..n {
            sum += self.coeffs[i] * self.hist[i];
        }

        sum
    }

    pub fn process(&mut self, input_: &mut [f32], output_: &mut [f32]) {
        let input:  &mut [Complex<f32>] = unsafe { slice::from_raw_parts_mut(input_  as *mut [f32] as *mut Complex<f32>, input_.len() / 2 )};
        let output:  &mut [Complex<f32>] = unsafe { slice::from_raw_parts_mut(output_  as *mut [f32] as *mut Complex<f32>, output_.len() / 2 )};

        for i in 0..input.len() {
            output[i] = self.do_step(input[i]);
        }
    }
}
