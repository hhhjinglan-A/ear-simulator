function Z = Z_cavity(f, p2)
%Z_CAVITY  Middle-ear cavities (SERIES element, Pascal 1998 Fig. 1 block 1).
%
%   Z = Z_CAVITY(F, P2) returns a complex column vector the same length as F
%   (Hz), in CGS acoustic ohms. See MIDDLEEARPARAMS for units.
%
%   Elements, read directly off Figure 1:
%       L_a  = 12 mH    C_cp = 3.6 uF   R_a  = 20 ohm
%       R_cm = 420 ohm  C_cm = 0.35 uF
%
%   Topology -- THREE branches in parallel between the same two nodes:
%
%       o--+--[L_a]--[C_cp]--[R_a]--+--o
%          |                        |
%          +--------[R_cm]----------+
%          |                        |
%          +--------[C_cm]----------+
%
%   The whole block sits in SERIES in the main path: the volume velocity
%   that moves the eardrum must also work against the air behind it.
%
%   Volume assignment (paper p. 1510): total cavity volume V_c = 5.5 cm^3,
%   of which the antrum and pneumatic cells are about 5 cm^3 and the
%   tympanic cavity V_tc = 0.5 cm^3 (Table I). With C = V/(rho_a*c^2),
%       C_cp = 3.6  uF  <->  5.07 cm^3  = antrum + pneumatic cells
%       C_cm = 0.35 uF  <->  0.49 cm^3  = tympanic cavity
%   so "cp" is the pneumatic cells and "cm" the tympanic cavity, and their
%   sum reproduces V_c to 1.2%.
%
%   See also MIDDLEEARPARAMS, MIDDLEEARRESPONSE.

f  = f(:);
w  = 2*pi*max(f, 1e-9);      % guard against division by zero at DC
jw = 1i*w;

Zpneu = jw*p2.L_a + 1./(jw*p2.C_cp) + p2.R_a;   % L_a + C_cp + R_a
Zrcm  = p2.R_cm * ones(size(f));                % R_cm alone
Zccm  = 1./(jw*p2.C_cm);                        % C_cm alone

Z = 1./(1./Zpneu + 1./Zrcm + 1./Zccm);          % three branches in parallel

end
