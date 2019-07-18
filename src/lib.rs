extern crate wasm_bindgen;
extern crate num_complex;

//use std::sync::Arc;
//use std::mem;
use std::slice;
use std::f32;
use std::ptr;
use num_complex::Complex;
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
    hist: Box<[Complex<f32>]>,
}

#[wasm_bindgen]
impl ComplexFirFilterKernel {
    #[allow(clippy::new_without_default)]
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let coeffs = vec![Complex::new(0.0, 0.0); 0].into_boxed_slice();
        let hist = vec![Complex::new(0.0, 0.0); 0].into_boxed_slice();
        Self {
            coeffs,
            hist
        }
    }

    pub fn set_coeffs(&mut self, coeffs_: &[f32]) {
        let n = coeffs_.len() / 2;
        let coeffs = unsafe { slice::from_raw_parts_mut(coeffs_  as *const [f32] as *mut Complex<f32>, n ) };
        self.coeffs = vec![Complex::new(0.0, 0.0); n].into_boxed_slice();
        self.hist = vec![Complex::new(0.0, 0.0); n].into_boxed_slice();
        self.coeffs.copy_from_slice(coeffs);
        console_log!("set_coeffs {}, {}", n, self.coeffs.len());
    }

    #[inline]
    fn do_step(&mut self, num: Complex<f32>)-> Complex<f32> {
        let n = self.coeffs.len();
        if n == 0 {
            return num;
        }

        unsafe {
            ptr::copy(
                self.hist.get_unchecked(0),
                self.hist.get_unchecked_mut(1),
                self.hist.len() - 1
            );
        }
        self.hist[0] = num;

        let mut sum : Complex<f32> = Complex::new(0.0, 0.0);
        for i in 0..n {
            sum += self.coeffs[i] * self.hist[i];
        }

        sum
    }

    pub fn process(&mut self, input_: &[f32], output_: &mut [f32]) {
        let input:  &[Complex<f32>] = unsafe { slice::from_raw_parts(input_  as *const [f32] as *const Complex<f32>, input_.len() / 2 )};
        let output:  &mut [Complex<f32>] = unsafe { slice::from_raw_parts_mut(output_  as *mut [f32] as *mut Complex<f32>, output_.len() / 2 )};

        for i in 0..input.len() {
            output[i] = self.do_step(input[i]);
        }
    }
}
