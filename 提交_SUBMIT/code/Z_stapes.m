function Z = Z_stapes(f, p2)
%Z_STAPES  Stapes, acoustic reflex, annular ligament, vestibular volume.
%
%   Z = Z_STAPES(F, P2) returns a complex column vector the same length as F
%   (Hz), in CGS acoustic ohms. SERIES element of the ladder, between the
%   incudo-stapedial joint and the cochlear load (Pascal 1998 Fig. 1).
%
%   Topology:  o--[L_s]--[C_st]--[R_la]--[C_la]--[L_v]--o
%
%   Elements:
%       L_s  = 8 mH    stapes inertance. Verified from anatomy: the stapes
%                      mass is 2.5 mg on a 3.2 mm^2 footplate, so the true
%                      acoustic mass is m/A_f^2 = 2.44 g/cm^4, and referred
%                      through the transformer 2.44/T_r^2 = 8.45 mH (p.1510).
%       C_st           acoustic reflex, Eq. 3. INFINITE at rest, so the
%                      paper's own words: "The capacitance is infinite for
%                      no reflex response". Stored as P2.invC_st = 1/C_st = 0.
%       R_la, C_la     annular ligament, Eqs. 6 and 7, at rest.
%       L_v  = 21 mH   vestibular volume (mass near 6.4 mg, p. 1510).
%
%   The three variable elements are drawn IN SERIES on the main line in
%   Figure 1, which is why the linear model reduces to L_s + R_la + C_la + L_v.
%
%   This block is separated from Z_COCHLEA because Figure 1 measures the
%   intracochlear pressure p_c ACROSS THE COCHLEAR LOAD ONLY, downstream of
%   these elements -- see MIDDLEEARRESPONSE.
%
%   NOTE: linear model only. P2.SPL_dB is ignored; see the TODO block in
%   MIDDLEEARPARAMS for the level-dependent forms.
%
%   See also MIDDLEEARPARAMS, Z_COCHLEA, MIDDLEEARRESPONSE.

f  = f(:);
w  = 2*pi*max(f, 1e-9);
jw = 1i*w;

if p2.nonlinear
    error('Z_stapes:notImplemented', ...
          ['Level-dependent C_st/R_la/C_la (Eq. 3, 6, 7) are not ' ...
           'implemented yet. Set p2.nonlinear = false.']);
end

% Eq. 3 gives 1/C_st directly, and 1/C_st = 0 at rest, so this term
% vanishes without ever forming 1/(jw*Inf).
Zst = p2.invC_st./jw;

Z = jw*p2.L_s + Zst + p2.R_la + 1./(jw*p2.C_la) + jw*p2.L_v;

end
