function Z = Z_cochlea(f, p2)
%Z_COCHLEA  Cochlea and helicotrema: the TERMINAL LOAD of the ladder.
%
%   Z = Z_COCHLEA(F, P2) returns a complex column vector the same length as
%   F (Hz), in CGS acoustic ohms.
%
%   Topology, exactly the block labelled "Cochlea / Helicotrema" in Pascal
%   1998 Fig. 1 -- two branches in parallel to ground:
%
%       o--+--[R_co]--------+--o
%          |                |
%          +--[R_h]--[L_h]--+
%
%       Z = R_co || (R_h + jwL_h)
%
%   Elements: R_co = 1211 ohm, R_h = 850 ohm, L_h = 150 mH.
%
%   The cochlea is a pure RESISTANCE, which is the point of the whole middle
%   ear: it is a transformer matching air onto a resistive load. The paper
%   derives R_co from the measured cochlear acoustic impedance of
%   0.35e11 Pa*s/m^3 (Zwislocki 1975) referred through the transformer:
%   1211 ohm * T_r^2 = 1211*289 = 3.50e5 CGS = 3.50e10 Pa*s/m^3, which is
%   that value. That arithmetic is what fixes the referral direction.
%
%   THE MODEL'S OUTPUT PRESSURE p_c IS TAKEN ACROSS THIS BLOCK ALONE.
%   The stapes, reflex, ligament and vestibular elements are upstream of it
%   and belong to Z_STAPES; including them here would overstate the output
%   at high frequency, where their mass reactance is large.
%
%   See also MIDDLEEARPARAMS, Z_STAPES, MIDDLEEARRESPONSE.

f  = f(:);
w  = 2*pi*max(f, 1e-9);
jw = 1i*w;

Zhelico = p2.R_h + jw*p2.L_h;
Z = 1./(1./p2.R_co + 1./Zhelico);

end
