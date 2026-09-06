function p2 = middleEarParams(variant, severity)
%MIDDLEEARPARAMS  Linear middle-ear element values (provenance UNVERIFIED).
%
%   P2 = MIDDLEEARPARAMS returns the parameter struct used by the five
%   impedance functions (Z_CAVITY, Z_EARDRUM, Z_OSSICLES, Z_JOINT,
%   Z_COCHLEA) and by MIDDLEEARRESPONSE.
%
%   P2 = MIDDLEEARPARAMS(VARIANT) selects a parameter set:
%       'normal'      healthy adult ear (default)
%       'otitisMedia' young child with otitis media with effusion (OME).
%
%   P2 = MIDDLEEARPARAMS('otitisMedia', SEVERITY) selects how extensive the
%   effusion is: 'mild', 'moderate' (default) or 'severe'. See the pathology
%   block at the end of this file for what changes, why, and which parts are
%   literature-supported versus assumed.
%
%   ===================== PROVENANCE -- READ THIS =====================
%   The element values below were SUPPLIED BY THE USER as a transcribed
%   table, labelled by them as Figure 1 + Table I of Pascal, Bourgeade,
%   Lagier & Legros (1998), "Linear and nonlinear model of the human
%   middle ear". THAT ATTRIBUTION HAS NOT BEEN CHECKED AGAINST THE PAPER:
%   no PDF of Pascal et al. (1998), and none of Lutman & Martin (1979),
%   was ever available while this code was written. No page or figure
%   number here can be relied on.
%
%   The LADDER TOPOLOGY was likewise not read off any figure. It was
%   dictated in prose by the user (one series path, two dead-end shunts),
%   and the cavity was then moved from shunt to series on PHYSICAL grounds
%   (the input-impedance minimum lands at 1169 Hz, inside the measured
%   0.6-1.3 kHz middle-ear resonance) -- an argument from physiology, NOT
%   from the paper. If Figure 1 in fact draws the cavity as a shunt, this
%   model is "those element values with a Zwislocki (1962) cavity", not
%   Pascal's circuit, and must be described that way.
%
%   WHAT HAS ACTUALLY BEEN VERIFIED, independently and arithmetically:
%     - the unit system            (C_cp+C_cm == V_c/(rho*c^2), 1.2%)
%     - the transformer referral   (L_s == (m/A_f^2)/T_r^2, 5.3%)
%     - internal circuit algebra   (see TEST_MIDDLEEAR, 86 checks)
%   Everything else about provenance is unconfirmed. Element-by-element
%   status is tabulated in README section 5.
%
%   NOTE: this file contains NO element named R_D2 or C_C, so the
%   Table 1 vs Figure 12 discrepancies in Lutman & Martin (1979)
%   (R_D2 = 12 or 220 ohm; C_C = 0.65 or 0.6 uF) have NOT been silently
%   resolved here -- those elements simply never entered the model.
%   ===================================================================
%
%   ---------------------------------------------------------------------
%   UNITS -- the table is written with electrical symbols (H, F, ohm) but
%   the numbers are CGS ACOUSTIC values, referred to the TYMPANIC side.
%   Two independent checks confirm this, so nothing here is guessed:
%
%     (a) compliance <-> volume.  C_cp + C_cm = 3.60 + 0.35 = 3.95 uF,
%         and V_c/(rho_a*c^2) = 5.5/(1.15e-3 * (3.5e4)^2) = 3.90e-6.
%         Agreement 1.2%  =>  1 F == 1 cm^5/dyn.
%
%     (b) inertance <-> mass.  The stapes is 2.5 mg on a 3.2 mm^2
%         footplate, so its true acoustic inertance is m/A_f^2 =
%         2.5e-3/0.032^2 = 2.44 g/cm^4. Referred to the tympanic side that
%         is 2.44/T_r^2 = 2.44/289 = 8.45 mH, and the table says L_s = 8 mH.
%         Agreement 5.6%  =>  1 H == 1 g/cm^4 AND the elements are already
%         divided by T_r^2, i.e. referred to the ear-canal side.
%
%   So every impedance returned by the Z_* functions is in CGS acoustic
%   ohms (dyn*s/cm^5). Multiply by P2.Z_unitToSI = 1e5 for SI (Pa*s/m^3).
%   Transfer functions are ratios and are therefore unit-free.
%   ---------------------------------------------------------------------
%
%   Impedance relationships used throughout:
%       Z_R = R,   Z_L = j*w*L,   Z_C = 1/(j*w*C),   w = 2*pi*f
%
%   See also MIDDLEEARRESPONSE, COMBINEDEARRESPONSE, Z_CAVITY, Z_EARDRUM,
%   Z_OSSICLES, Z_JOINT, Z_COCHLEA.

if nargin < 1 || isempty(variant),  variant  = 'normal';   end
if nargin < 2 || isempty(severity), severity = 'moderate'; end

p2.Z_unitToSI = 1e5;      % CGS acoustic ohm -> Pa*s/m^3

% ---- medium and anatomy (Table I) --------------------------------------
p2.rho_a = 1.15e-3;   % g/cm^3
p2.c     = 3.5e4;     % cm/s
p2.V_c   = 5.5;       % cm^3, total middle-ear cavity volume
p2.A_t   = 0.55;      % cm^2, effective eardrum area (55 mm^2)
p2.A_f   = 0.032;     % cm^2, stapes footplate area (3.2 mm^2)
p2.leverRatio = 1;    % ossicular lever ratio (Table I)

% Eq. 1: total transformer ratio. NOT an estimate -- A_t/A_f = 17.19, and
% the paper rounds the area ratio to 17 with a lever ratio of 1.
p2.areaRatio = 17;
p2.N = p2.leverRatio * p2.areaRatio;      % T_r = 17  (24.6 dB)

% ---- 1. middle-ear cavities  -> Z_CAVITY (shunt) -----------------------
% C_cp  tympanic cavity + antrum compliance
% L_a, R_a   aditus ad antrum: air mass and viscous loss
% R_cm, C_cm mastoid air cells: loss and compliance
p2.C_cp = 3.6e-6;
p2.L_a  = 12e-3;
p2.R_a  = 20;
p2.R_cm = 420;
p2.C_cm = 0.35e-6;

% ---- 2. eardrum + malleus + incus  -> Z_OSSICLES (series main path) ----
% The coupled drum-malleus-incus block: the sound actually goes through it.
p2.C_te = 1.4e-6;
p2.L_te = 40e-3;
p2.R_te = 65;

% ---- 3. eardrum losses  -> Z_EARDRUM (shunt) ---------------------------
% Three series-RC cells in parallel: the part of the drum that moves
% without driving the ossicles, i.e. a dead end that steals volume
% velocity. L_ti rides in the second cell (see Z_EARDRUM).
p2.R_ti1 = 200;      p2.C_ti1 = 0.5e-6;
p2.R_ti2 = 105;      p2.C_ti2 = 0.3e-6;   p2.L_ti = 15e-3;
p2.R_ti3 = 12500;    p2.C_ti3 = 0.2e-6;
p2.L_ti_inBranch2 = true;   % false = L_ti in series with the whole block

% ---- 4. incudo-stapedial joint  -> Z_JOINT (shunt) ---------------------
% A compliant joint is a dead end: motion that goes into flexing the joint
% never reaches the stapes.
p2.C_is = 0.03e-6;
p2.R_is = 170;

% ---- 5. stapes + ligament + cochlear load -> Z_COCHLEA (terminal load) --
p2.L_s  = 8e-3;      % stapes inertance (verified above)
p2.L_v  = 21e-3;     % vestibular volume
p2.R_co = 1211;      % cochlear acoustic resistance
p2.R_h  = 850;       % helicotrema resistance
p2.L_h  = 150e-3;    % helicotrema inertance

% Acoustic reflex and annular ligament, evaluated at REST (linear model).
% The paper gives these as level-dependent formulae; the linear values are
% what those formulae return at zero activation, they are not assumptions:
%
%   Eq.3  1/C_st = t1*L_ts^2 + t2*L_ts,   L_ts = 0 below ~80 dB
%         -> 1/C_st = 0, i.e. the reflex capacitor is a short circuit.
%         Stored as the RECIPROCAL so that "infinite C" needs no Inf.
%   Eq.6  R_la = r1*a^re + r2*a + r3,     a = alpha_t = 0 below ~120 dB
%         -> R_la = r3 = 442 ohm
%   Eq.7  C_la = c1*exp(a^ce) + c2*a + c3, with a = alpha_t = p_t/1 Pa
%         -> at rest C_la = c1*exp(0) + c3 = -3.33e-2 + 0.54 = 0.5067
%
%   UNITS OF Eq. 7 -- a correction to the paper as printed. The paper gives
%   c1, c2, c3 in FARADS, which would make C_la = 0.5067 F at rest. In this
%   circuit 1 F == 1 cm^5/dyn, so 0.54 F is a compliance five orders of
%   magnitude larger than the ENTIRE middle-ear cavity (C_cp + C_cm =
%   3.95 uF) -- i.e. a dead short, and physically impossible for a ligament.
%   Read as MICROFARADS, consistent with every other capacitance in Fig. 1,
%   it becomes a real stiffness, and only then does the model reproduce the
%   paper's own Figs. 2 and 3:
%
%       C_la = 0.5067 F   ->  Fig.3 3.56 dB rms,  Fig.2 2.77 dB rms
%       C_la = 0.5067 uF  ->  Fig.3 1.34 dB rms,  Fig.2 0.91 dB rms
%
%   Both residuals are then inside the error of reading the scanned figures.
%   See TEST_VSPAPER. p2.C_la_unitsAsPrinted = true restores the literal
%   reading for comparison.
p2.invC_st = 0;         % 1/C_st  [F^-1]
p2.R_la    = 442;
p2.C_la_unitsAsPrinted = false;
if p2.C_la_unitsAsPrinted
    p2.C_la = 0.5067;       % literal Eq. 7, farads
else
    p2.C_la = 0.5067e-6;    % Eq. 7 read as microfarads
end

% ---- topology switches --------------------------------------------------
% The network is a LADDER (see MIDDLEEARRESPONSE). Series/shunt placement
% is fixed there; these switches cover the two connections that Figure 1
% does not settle unambiguously by inspection.
%
% cavityPlacement: 'series' = cavity in series with the drum, the Zwislocki
%                             (1962) arrangement. THE DEFAULT, on physical
%                             grounds: it puts the input-impedance minimum
%                             at 1169 Hz, inside the 0.6-1.3 kHz range of the
%                             measured human middle-ear resonance.
%                  'shunt'  = C_cp network hangs off the input node. Kept for
%                             comparison and rejected: C_cp then short-
%                             circuits the input at high frequency and |Z_in|
%                             falls monotonically to 2.2e5 Pa*s/m^3 at 20 kHz,
%                             with its minimum at the band edge, which no
%                             measured middle ear does.
% The two differ by at most 2.5 dB in transmission, so this is an
% input-impedance question. See README section 6.
p2.cavityPlacement = 'series';

% ligamentTopology: how R_la and C_la connect inside the annular ligament.
%   'series'   R_la + 1/(jwC_la) -> 442 ohm at rest (a lossy spring)
%   'parallel' R_la || 1/(jwC_la) -> ~0 ohm at rest, ligament disappears
% 'series' is used because C_la = 0.507 F is effectively a short, and a
% parallel connection would delete the ligament from the linear model.
p2.ligamentTopology = 'series';

% Source impedance seen by the drum, in CGS acoustic ohms. 0 = ideal
% pressure source, which is what "H_middle = P_v/P_tm" means and what the
% cascade in COMBINEDEARRESPONSE assumes. Set it to rho*c/A_canal (~94)
% to study how much the ear canal actually loads the middle ear.
p2.Z_source = 0;

% =========================================================================
%  TODO -- nonlinear acoustic reflex / annular ligament (Eq. 3, 6, 7)
%
%  Above ~80 dB SPL the stapedius reflex stiffens C_st; above ~120 dB the
%  annular ligament itself becomes level dependent. Coefficients:
%     t1 = 1675 dB^-2 F^-1,  t2 = 33000 dB^-1 F^-1
%     r1 = 72 ohm, r2 = -251 ohm, r3 = 442 ohm, re = 0.266
%     c1 = -3.33e-2, c2 = 4.64e-4, c3 = 0.54, ce = 0.174  (see units note
%     above: printed as F, must be read as uF)
%     alpha_t = p_t/1 Pa  (the eardrum pressure in pascals)
%  Implement inside Z_COCHLEA only, driven by p2.SPL_dB, so the rest of the
%  circuit stays linear. p2.SPL_dB currently has NO effect.
% =========================================================================
p2.nonlinear = false;
p2.SPL_dB    = 60;      % currently UNUSED

% =========================================================================
%  PATHOLOGY VARIANT -- otitis media with effusion in a small child
% =========================================================================
p2.variant = 'normal';

switch lower(variant)
    case 'normal'
        % nothing to do

    case {'otitismedia', 'ome'}
        p2.variant = 'otitisMedia';

        % -----------------------------------------------------------------
        % *** EXPLORATORY SIMULATION -- NOT A VALIDATED CLINICAL MODEL ***
        %
        % WHAT IS MODELLED: a young child with otitis media with effusion.
        % Every multiplier's DIRECTION is supported by clinical literature
        % (cited in README section 9); every MAGNITUDE is an assumed
        % order-of-magnitude guess with no source. Treat all numeric output
        % of this variant as exploratory, not predictive.
        %
        % Every multiplier below has a DIRECTION supported by the clinical
        % literature and a MAGNITUDE that is an order-of-magnitude estimate.
        % All magnitudes are ASSUMED. The 'mild' row is the a-priori guess,
        % written down BEFORE the model was run; 'moderate' and 'severe'
        % extend it to more extensive effusions. None of them was tuned to
        % reproduce the clinical hearing loss -- that comparison is the test
        % of the model, not an input to it. See README section 9.
        %
        %   (1) airFraction  cavity air volume remaining, as a fraction of
        %       the healthy ADULT 5.5 cm^3. Two compounding reasons:
        %       paediatric -- mastoid pneumatization is incomplete until
        %       about age 10 and is further suppressed by early-childhood
        %       otitis media; and effusion -- fluid replaces the air that is
        %       left. DIRECTION: definitional for OME. MAGNITUDE ASSUMED.
        %
        %   (2) R_a  the aditus narrows as the mucosa swells, acoustically
        %       cutting the mastoid off from the tympanic cavity.
        %       DIRECTION: supported. MAGNITUDE ASSUMED. Viscous resistance
        %       climbs steeply as a lumen narrows, so a modest narrowing
        %       gives a large factor.
        %
        %   (3) L_te  fluid mass-loads the drum and ossicles. This is the
        %       mechanism behind the MEASURED finding that OME lowers the
        %       middle-ear resonance frequency, whereas stiffening diseases
        %       such as otosclerosis raise it. DIRECTION: measured.
        %       MAGNITUDE ASSUMED.
        %
        %   (4) R_te  a viscous effusion damps the drum heavily; this is
        %       what flattens the tympanogram into a type B trace.
        %       DIRECTION: supported. MAGNITUDE ASSUMED.
        %
        %   (5) C_te  the drum thickens and is retracted by negative
        %       middle-ear pressure, so it stiffens. DIRECTION: supported.
        %       MAGNITUDE ASSUMED.
        %
        % NOT changed, deliberately: the cochlea (R_co, R_h, L_h) and the
        % incudo-stapedial joint. OME is a conductive pathology -- bone
        % conduction stays normal -- so nothing distal to the ossicles
        % should move. That is a modelling commitment, not an oversight.
        % -----------------------------------------------------------------
        %             airFraction  R_a   L_te  R_te  C_te
        table = struct( ...
            'mild',     [0.200,     10,   1.8,   3,   0.70], ...
            'moderate', [0.050,     10,   4.0,  10,   0.70], ...
            'severe',   [0.005,     50,   6.0,  15,   0.20]);

        if ~isfield(table, lower(severity))
            error('middleEarParams:badSeverity', ...
                  'severity must be ''mild'', ''moderate'' or ''severe''.');
        end
        k = table.(lower(severity));

        p2.ome.severity    = lower(severity);
        p2.ome.airFraction = k(1);
        p2.ome.R_a_factor  = k(2);
        p2.ome.L_te_factor = k(3);
        p2.ome.R_te_factor = k(4);
        p2.ome.C_te_factor = k(5);

        p2.C_cp = p2.C_cp * k(1);
        p2.C_cm = p2.C_cm * k(1);
        p2.R_a  = p2.R_a  * k(2);
        p2.L_te = p2.L_te * k(3);
        p2.R_te = p2.R_te * k(4);
        p2.C_te = p2.C_te * k(5);

    otherwise
        error('middleEarParams:badVariant', ...
              'variant must be ''normal'' or ''otitisMedia''.');
end

end
