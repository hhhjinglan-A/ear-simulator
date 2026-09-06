function Z = Z_joint(f, p2)
%Z_JOINT  Incudo-stapedial joint (SHUNT branch of the ladder).
%
%   Z = Z_JOINT(F, P2) returns a complex column vector the same length as F
%   (Hz), in CGS acoustic ohms.
%
%   Elements: C_is  joint compliance
%             R_is  joint loss
%
%   Internal topology:  o--[R_is]--[C_is]--o   (to ground)
%
%   The joint is a dead end, not a link in the chain: motion that goes into
%   flexing the incudo-stapedial joint never reaches the stapes. At low
%   frequency 1/(w*C_is) is huge and nothing leaks; towards 20 kHz the
%   branch impedance falls to R_is = 170 ohm, which is small compared with
%   the cochlear load, so most of the drive is short-circuited away. That
%   slippage is the main reason the modelled middle ear rolls off above
%   about 2 kHz.
%
%   See also MIDDLEEARPARAMS, MIDDLEEARRESPONSE.

f  = f(:);
w  = 2*pi*max(f, 1e-9);
jw = 1i*w;

Z = p2.R_is + 1./(jw*p2.C_is);

end
