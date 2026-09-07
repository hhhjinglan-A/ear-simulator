function ir = combinedEarIR(p1, p2, fs, N)
%COMBINEDEARIR  Impulse response of the cascaded outer + middle ear model.
%
%   IR = COMBINEDEARIR(P1, P2, FS, N) samples the cascaded transfer function
%   on the FFT bin grid for sample rate FS, enforces Hermitian symmetry so
%   the inverse transform is real, and returns an N-point windowed impulse
%   response suitable for convolution with a signal.
%
%   Same construction as OUTEREARIR in the outer-ear assignment, but driven
%   by COMBINEDEARRESPONSE so the middle ear is included.
%
%   Uses base MATLAB only (no Signal Processing Toolbox).
%
%   See also COMBINEDEARRESPONSE, COMBINEDEARMODEL.

if nargin < 4, N  = 4096;  end
if nargin < 3, fs = 44100; end

if mod(N, 2) ~= 0
    error('combinedEarIR:oddLength', 'N must be even.');
end

nf = N/2 + 1;
f  = (0:nf-1).'*(fs/N);

C = combinedEarResponse(p1, p2, f);
H = C.total;

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
