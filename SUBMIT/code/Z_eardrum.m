function Z = Z_eardrum(f, p2)
%Z_EARDRUM  Eardrum losses (SHUNT branch, Pascal 1998 Fig. 1 block 2).
%
%   Z = Z_EARDRUM(F, P2) returns a complex column vector the same length as
%   F (Hz), in CGS acoustic ohms.
%
%   This is the part of the tympanic membrane that vibrates WITHOUT driving
%   the ossicles ("the eardrum in fact vibrates in several segments",
%   p. 1510). In the ladder it is a dead end that bleeds volume velocity to
%   ground, and it taps the main line BEFORE C_te -- i.e. between the cavity
%   block and the eardrum-malleus-incus block.
%
%   Topology, read directly off Figure 1: one SERIES chain containing two
%   parallel sub-blocks --
%
%       o--[R_ti1]--[C_ti1]--+--[C_ti2]--[R_ti2]--+--+--[R_ti3]--+--o
%                            |                    |  |           |
%                            +-------[L_ti]-------+  +--[C_ti3]--+
%
%       Z = R_ti1 + 1/(jwC_ti1)
%           + ( (1/(jwC_ti2) + R_ti2) || jwL_ti )
%           + ( R_ti3 || 1/(jwC_ti3) )
%
%   Values: R_ti1 200 ohm, C_ti1 0.5 uF, C_ti2 0.3 uF, R_ti2 105 ohm,
%           L_ti 15 mH, R_ti3 12500 ohm, C_ti3 0.2 uF.
%
%   NOTE: this is NOT three independent parallel RC cells. An earlier build
%   of this model made that mistake; the series chain above is what the
%   figure actually draws, and it changes the high-frequency behaviour a
%   great deal.
%
%   See also MIDDLEEARPARAMS, MIDDLEEARRESPONSE.

f  = f(:);
w  = 2*pi*max(f, 1e-9);
jw = 1i*w;

Zin1 = p2.R_ti1 + 1./(jw*p2.C_ti1);                       % series entry
Zpar1 = par(1./(jw*p2.C_ti2) + p2.R_ti2, jw*p2.L_ti);     % (C_ti2+R_ti2) || L_ti
Zpar2 = par(p2.R_ti3, 1./(jw*p2.C_ti3));                  % R_ti3 || C_ti3

Z = Zin1 + Zpar1 + Zpar2;

end

% -------------------------------------------------------------------------
function Z = par(Za, Zb)
% Parallel combination: admittances add, then invert.
Z = 1./(1./Za + 1./Zb);
end
