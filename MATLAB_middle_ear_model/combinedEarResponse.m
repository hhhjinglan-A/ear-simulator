function C = combinedEarResponse(p1, p2, f)
%COMBINEDEARRESPONSE  Cascade the outer-ear and middle-ear models.
%
%   C = COMBINEDEARRESPONSE(P1, P2, F) evaluates OUTEREARRESPONSE with the
%   outer-ear parameters P1 and MIDDLEEARRESPONSE with the middle-ear
%   parameters P2 at the frequencies F (Hz), and returns a struct C with
%
%       C.outer   the full outer-ear struct R  (see OUTEREARRESPONSE)
%       C.middle  the full middle-ear struct R2 (see MIDDLEEARRESPONSE)
%       C.Houter  = C.outer.total    P_eardrum   / P_freefield
%       C.Hmiddle = C.middle.total   P_vestibule / P_eardrum
%       C.total   = C.Houter .* C.Hmiddle
%       C.f       the frequency vector used (default 20 Hz - 20 kHz)
%
%   Both factors are complex, dimensionless PRESSURE ratios, which is what
%   makes the product meaningful:
%
%       H_total(f) = H_outer(f) * H_middle(f)
%
%   ---------------------------------------------------------------------
%   ASSUMPTIONS BEHIND THE SIMPLE PRODUCT  (state these as limitations)
%   ---------------------------------------------------------------------
%   1. NO REVERSE LOADING. The cascade is valid only if the middle ear's
%      input impedance is much larger than the source impedance the ear
%      canal presents at its terminating (eardrum) end,
%
%           |Z_in,middle| >> |Z_source,canal| ,
%
%      so that essentially no volume velocity is drawn from the canal and
%      the pressure at the eardrum is set by the outer ear alone. In other
%      words the middle ear is treated as an open circuit that senses
%      P_eardrum without perturbing it, and reflection back into the canal
%      is ignored. C.loadingRatio below quantifies how badly that is
%      violated -- for this parameter set it is NOT comfortably satisfied,
%      which is the single most important limitation of the combined model.
%
%   2. THE DRIVING PRESSURE IS PRESCRIBED. P_eardrum is imposed by the outer
%      ear as an ideal pressure source (P2.Z_source = 0), so the middle ear
%      cannot push back on it. With the cavity in series (the default) the
%      cavity at least still divides that pressure and shows up in H_middle;
%      in the rejected 'shunt' variant it would drop out of H_middle
%      entirely and act only through the loading that assumption 1 discards.
%      Either way, setting P2.Z_source to C.Zcanal is the way to see how much
%      the canal really loads the middle ear.
%
%   3. ONE-WAY SIGNAL FLOW. The outer-ear model is a prescribed pressure
%      gain, not a two-port; there is no path by which stapes motion or
%      middle-ear reflection feeds back into the concha/pinna terms.
%
%   4. INCONSISTENT TERMINATION. OUTEREARRESPONSE's quarter-wave canal is
%      terminated by a RIGID eardrum (pressure gain 1/cos(kL)); its IEC 318
%      option terminates in a fixed lumped drum impedance. Neither
%      termination is the Z_in computed here, so the two models do not share
%      a boundary condition -- the cascade is a convenience, not one circuit.
%
%   5. LINEARITY AND TIME INVARIANCE. Both models are LTI, so the product is
%      exact only while the middle ear is linear. The acoustic reflex and
%      level-dependent annular ligament (P2.nonlinear) are not modelled.
%
%   6. NO INDIVIDUALISATION. The outer-ear parameters are generic adult
%      anatomy; the middle-ear values are a transcribed circuit table of
%      unverified provenance (see MIDDLEEARPARAMS). They are
%      not from the same ear, or from any one ear.
%   ---------------------------------------------------------------------
%
%   C.loadingRatio is |Z_in,middle| / Z_canal, both converted to SI, with
%   the canal source impedance estimated as its characteristic impedance
%   rho*c/A. Assumption 1 is comfortable where this is >> 1 and fails where
%   it approaches 1. It is a diagnostic, not a correction: nothing in
%   C.total uses it.
%
%   See also OUTEREARRESPONSE, MIDDLEEARRESPONSE, GENERATECOMBINEDFIGURES.

if nargin < 3 || isempty(f)
    f = logspace(log10(20), log10(20000), 1024).';
end
f = f(:);

R1 = outerEarResponse(p1, f);
R2 = middleEarResponse(p2, f);

Htotal = R1.total .* R2.total;

C.outer   = R1;
C.middle  = R2;
C.Houter  = R1.total;
C.Hmiddle = R2.total;
C.total   = Htotal;
C.f       = f;

% ---- diagnostic for assumption 1 ---------------------------------------
% Characteristic acoustic impedance of the ear canal, rho*c/A, in SI. The
% middle-ear impedances are CGS acoustic, hence the p2.Z_unitToSI factor.
Acanal   = pi*(p1.canalDiameter/2)^2;          % m^2
C.Zcanal = p1.rho*p1.c/Acanal;                 % Pa*s/m^3
C.ZinSI  = abs(R2.inputImpedance)*p2.Z_unitToSI;
C.loadingRatio = C.ZinSI/C.Zcanal;

g = 20*log10(max(abs(Htotal), 1e-12));
[C.peakGainDb, ip] = max(g);
C.fPeak = f(ip);

end
