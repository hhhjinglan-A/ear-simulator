function ir = outerEarIR(p, fs, N)
%OUTEREARIR  Impulse response of the outer-ear model, for auditioning audio.
%
%   IR = OUTEREARIR(P, FS, N) samples the modelled transfer function on the
%   FFT bin grid for sample rate FS, enforces Hermitian symmetry so the
%   inverse transform is real, and returns an N-point windowed impulse
%   response suitable for convolution with a signal.
%
%   Uses base MATLAB only (no Signal Processing Toolbox).
%
%   See also OUTEREARRESPONSE, OUTEREARMODEL.

if nargin < 3, N  = 4096;  end
if nargin < 2, fs = 44100; end

if mod(N, 2) ~= 0
    error('outerEarIR:oddLength', 'N must be even.');
end

nf = N/2 + 1;
f  = (0:nf-1).'*(fs/N);

R = outerEarResponse(p, f);
H = R.total;

% A real impulse response requires a real DC and Nyquist bin.
H(1)   = abs(H(1));
H(end) = abs(H(end));

% Mirror to a full Hermitian spectrum.
Hfull = [H; conj(H(end-1:-1:2))];

ir = real(ifft(Hfull, N));
ir = circshift(ir, N/2);                       % centre the response

% Hann window, written out because hann() lives in the Signal Processing
% Toolbox and we are staying inside base MATLAB.
win = 0.5 - 0.5*cos(2*pi*(0:N-1).'/(N-1));
ir  = ir.*win;

end
