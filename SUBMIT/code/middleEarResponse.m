function R2 = middleEarResponse(p2, f)
%MIDDLEEARRESPONSE  Pascal et al. (1998) Fig. 1 middle-ear ladder network.
%
%   R2 = MIDDLEEARRESPONSE(P2, F) evaluates the circuit at the frequencies F
%   (Hz) for the parameter struct P2 (see MIDDLEEARPARAMS). If F is omitted
%   it defaults to 1024 log-spaced points from 20 Hz to 20 kHz.
%
%   THE CIRCUIT -- transcribed from Figure 1 of the paper, block by block.
%
%     p_t o--[Z_cavity]--o--[Z_ossicles]--o--[Z_stapes]--o
%          u_t      node1 |         node2 |        node3 |
%                    [Z_eardrum]     [Z_joint]     [Z_cochlea]  <- p_c here
%                         |               |             |
%                        gnd             gnd           gnd
%
%     SERIES (main path) : Z_cavity    middle-ear cavities
%                          Z_ossicles  eardrum + malleus + incus (C_te L_te R_te)
%                          Z_stapes    stapes, reflex, ligament, vestibule
%     SHUNT (dead ends)  : Z_eardrum   eardrum losses (taps BEFORE C_te)
%                          Z_joint     incudo-stapedial joint (taps BEFORE L_s)
%     TERMINAL LOAD      : Z_cochlea   cochlea || helicotrema
%
%   DEFINITIONS, matching the paper's own Figs. 2 and 3:
%
%     R2.inputImpedance   z_t = p_t/u_t, the impedance looking into the whole
%                         network from the eardrum. Compare with Fig. 2.
%                         CGS acoustic ohms; x P2.Z_unitToSI for Pa*s/m^3.
%
%     R2.total            H(f) = p_c/p_t, dimensionless, where p_c is the
%                         pressure across Z_COCHLEA ALONE. Compare with
%                         Fig. 3, which plots 20*log10|H|.
%
%   THE TRANSFORMER. Figure 1 does not draw it. The paper is explicit:
%   "The impedance match between the eardrum and the cochlea can be
%   symbolized by an electrical transformer. This influence is not
%   represented in Fig. 1 but must be considered in the computation."
%   T_r = (lever ratio)*(area ratio) = 1*17 = 17 (Eq. 1). All element values
%   are already referred to the tympanic side -- confirmed twice, by
%   L_s = (m/A_f^2)/T_r^2 and by R_co*T_r^2 = 0.35e11 Pa*s/m^3 -- so the
%   pressure across the referred cochlear load must be multiplied by T_r
%   once, and only once, to give the true intracochlear pressure.
%
%   COMPONENT FACTORS. Four factors multiply EXACTLY to R2.total:
%
%     R2.cavity      pressure division by the cavity block
%     R2.ossicles    pressure division by the eardrum-malleus-incus block
%     R2.stapes      pressure division by the stapes/ligament chain
%     R2.transformer T_r
%
%   Two further fields are CURRENT-division diagnostics, showing how much
%   volume velocity each dead end steals. They are NOT part of the product:
%
%     R2.eardrum     fraction continuing past the eardrum-loss shunt
%     R2.joint       fraction continuing past the joint shunt
%
%   Also returned: R2.Zcavity R2.Zeardrum R2.Zossicles R2.Zjoint R2.Zstapes
%   R2.Zcochlea, the node impedances R2.Znode1 R2.Znode2 R2.Znode3,
%   R2.volumeVelocity (u_s per unit p_t), R2.fResonance (min |z_t|),
%   R2.fPeak / R2.peakGainDb, and R2.f.
%
%   See also MIDDLEEARPARAMS, COMBINEDEARRESPONSE, Z_CAVITY, Z_EARDRUM,
%   Z_OSSICLES, Z_JOINT, Z_STAPES, Z_COCHLEA.

if nargin < 2 || isempty(f)
    f = logspace(log10(20), log10(20000), 1024).';
end
f = f(:);

%% ---- 1. branch impedances ---------------------------------------------
Zcav = Z_cavity(f, p2);      % series, cavities
Zed  = Z_eardrum(f, p2);     % shunt at node 1, eardrum losses
Zoss = Z_ossicles(f, p2);    % series, eardrum + malleus + incus
Zjt  = Z_joint(f, p2);       % shunt at node 2, incudo-stapedial joint
Zsta = Z_stapes(f, p2);      % series, stapes + reflex + ligament + vestibule
Zco  = Z_cochlea(f, p2);     % terminal load, cochlea || helicotrema

%% ---- 2. collapse the ladder from the load backwards --------------------
Z3 = Zco;                              % impedance at node 3
Z2 = par(Zjt,  Zsta + Z3);             % impedance at node 2
Z1 = par(Zed,  Zoss + Z2);             % impedance at node 1

switch lower(p2.cavityPlacement)
    case 'series'
        % Figure 1 draws the cavity block in series. This is the default and
        % is now confirmed by the figure, not merely inferred.
        Zin    = Zcav + Z1;
        srcDiv = Z1./(p2.Z_source + Zcav + Z1);
    case 'shunt'
        % Kept only for the E4 control experiment: with the cavity hanging
        % off the input node it cannot affect H at all when Z_source = 0.
        Zin = par(Zcav, Z1);
        if p2.Z_source == 0
            srcDiv = ones(size(f));
        else
            srcDiv = Zin./(p2.Z_source + Zin);
        end
    otherwise
        error('middleEarResponse:badPlacement', ...
              'p2.cavityPlacement must be ''series'' or ''shunt''.');
end

R2.Zcavity   = Zcav;   R2.Zeardrum  = Zed;
R2.Zossicles = Zoss;   R2.Zjoint    = Zjt;
R2.Zstapes   = Zsta;   R2.Zcochlea  = Zco;
R2.Znode1 = Z1;  R2.Znode2 = Z2;  R2.Znode3 = Z3;
R2.inputImpedance = Zin;

%% ---- 3. cascade of pressure divisions ----------------------------------
R2.cavity      = srcDiv;                 % p_t   -> node 1
R2.ossicles    = Z2./(Zoss + Z2);        % node 1 -> node 2
R2.stapes      = Z3./(Zsta + Z3);        % node 2 -> node 3
R2.transformer = p2.N;

R2.total = p2.N .* R2.cavity .* R2.ossicles .* R2.stapes;

% Current-division diagnostics: what each dead end steals.
R2.eardrum = Zed./(Zed + Zoss + Z2);
R2.joint   = Zjt./(Zjt + Zsta + Z3);

% Stapes volume velocity u_s per unit eardrum pressure p_t (tympanic-referred).
R2.volumeVelocity = (R2.total/p2.N)./Zco;

%% ---- 4. characteristic frequencies -------------------------------------
% The middle-ear resonance is the FIRST LOCAL minimum of |z_t| (Fig. 2 puts
% it near 1.8 kHz). The global minimum is not it: |z_t| keeps falling toward
% the top of the band, so argmin would just return the band edge.
az = abs(Zin);
loc = find(f > 200 & [false; az(2:end-1) < az(1:end-2) & az(2:end-1) < az(3:end); false], 1);
if isempty(loc), [~, loc] = min(az); end
R2.fResonance = f(loc);

g = 20*log10(max(abs(R2.total), 1e-12));
[R2.peakGainDb, ip] = max(g);
R2.fPeak = f(ip);

R2.f  = f;
R2.p2 = p2;

end

% -------------------------------------------------------------------------
function Z = par(Za, Zb)
% Parallel combination: admittances add, then invert.
Z = 1./(1./Za + 1./Zb);
end
