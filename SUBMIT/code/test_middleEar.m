function test_middleEar()
%TEST_MIDDLEEAR  Verification suite for the middle-ear and combined models.
%
%   Groups:
%     A  the six impedance blocks of Pascal 1998 Fig. 1
%     B  the ladder algebra in MIDDLEEARRESPONSE, rebuilt independently
%     C  physics sanity: unit system, transformer referral, response shape
%     D  the outer+middle cascade
%     E  cavity placement (Fig. 1 says series; the shunt variant is kept
%        only as the control for experiment E4)
%
%   Agreement with the paper's own published curves is checked separately by
%   TEST_VSPAPER.
%
%   See also MIDDLEEARRESPONSE, TEST_VSPAPER, COMBINEDEARRESPONSE.

n = 0; fail = 0;
    function chk(name, cond)
        n = n + 1;
        if cond, fprintf('  PASS  %s\n', name);
        else,    fprintf('  FAIL  %s\n', name); fail = fail + 1; end
    end

p2 = middleEarParams();
p1 = outerEarParams();
f  = logspace(log10(20), log10(20000), 777).';
dbv = @(x) 20*log10(max(abs(x), 1e-12));

%% ---- A. impedance blocks ----------------------------------------------
fprintf('--- A. impedance blocks (Fig. 1) ---\n');
Zs = {@Z_cavity, @Z_eardrum, @Z_ossicles, @Z_joint, @Z_stapes, @Z_cochlea};
nm = {'Z_cavity','Z_eardrum','Z_ossicles','Z_joint','Z_stapes','Z_cochlea'};
for k = 1:numel(Zs)
    Z = Zs{k}(f, p2);
    chk([nm{k} ' size matches f'], isequal(size(Z), size(f)));
    chk([nm{k} ' complex'],        ~isreal(Z));
    chk([nm{k} ' finite'],         all(isfinite(Z)));
    chk([nm{k} ' passive Re>=0'],  all(real(Z) >= -1e-9));
    chk([nm{k} ' row input -> column'], iscolumn(Zs{k}(f.', p2)));
    chk([nm{k} ' DC guarded'],     all(isfinite(Zs{k}([0;1000], p2))));
end
q = p2; q.nonlinear = true;
try
    Z_stapes(f,q); ok = false;
catch
    ok = true;
end
chk('Z_stapes refuses nonlinear (not implemented)', ok);

% Block-level structure, checked against Fig. 1 rather than assumed.
w = 2*pi*f; jw = 1i*w;
chk('Z_cavity == (L_a+C_cp+R_a) || R_cm || C_cm', ...
    maxrel(Z_cavity(f,p2), par3(jw*p2.L_a + 1./(jw*p2.C_cp) + p2.R_a, ...
                                p2.R_cm*ones(size(f)), 1./(jw*p2.C_cm))) < 1e-12);
chk('Z_ossicles == R_te + L_te + C_te in series', ...
    maxrel(Z_ossicles(f,p2), p2.R_te + jw*p2.L_te + 1./(jw*p2.C_te)) < 1e-12);
chk('Z_joint == R_is + C_is in series', ...
    maxrel(Z_joint(f,p2), p2.R_is + 1./(jw*p2.C_is)) < 1e-12);
chk('Z_cochlea == R_co || (R_h + L_h)', ...
    maxrel(Z_cochlea(f,p2), par2(p2.R_co, p2.R_h + jw*p2.L_h)) < 1e-12);
chk('Z_eardrum == R_ti1+C_ti1+((C_ti2+R_ti2)||L_ti)+(R_ti3||C_ti3)', ...
    maxrel(Z_eardrum(f,p2), p2.R_ti1 + 1./(jw*p2.C_ti1) ...
        + par2(1./(jw*p2.C_ti2) + p2.R_ti2, jw*p2.L_ti) ...
        + par2(p2.R_ti3, 1./(jw*p2.C_ti3))) < 1e-12);

%% ---- B. ladder algebra -------------------------------------------------
fprintf('--- B. ladder algebra ---\n');
R2 = middleEarResponse(p2, f);
chk('total finite', all(isfinite(R2.total)));
chk('Zin passive',  all(real(R2.inputImpedance) > 0));
chk('default f spans 20..20k', ...
    abs(min(middleEarResponse(p2).f)-20) < 1e-9 && ...
    abs(max(middleEarResponse(p2).f)-20000) < 1e-6);

prod4 = R2.cavity .* R2.ossicles .* R2.stapes .* R2.transformer;
chk('four factors multiply to total', maxrel(prod4, R2.total) < 1e-12);

% Independent rebuild straight from the six branch impedances.
Z3 = R2.Zcochlea;
Z2 = par2(R2.Zjoint,  R2.Zstapes  + Z3);
Z1 = par2(R2.Zeardrum, R2.Zossicles + Z2);
chk('Znode3 == Zcochlea',                 maxrel(Z3, R2.Znode3) < 1e-12);
chk('Znode2 == Zjoint || (Zstapes+Znode3)',   maxrel(Z2, R2.Znode2) < 1e-12);
chk('Znode1 == Zeardrum || (Zoss+Znode2)',    maxrel(Z1, R2.Znode1) < 1e-12);
chk('Zin == Zcavity + Znode1', maxrel(R2.Zcavity + Z1, R2.inputImpedance) < 1e-12);
Hdirect = p2.N * (Z1./(R2.Zcavity+Z1)) .* (Z2./(R2.Zossicles+Z2)) ...
                .* (Z3./(R2.Zstapes+Z3));
chk('total == N * three pressure divisions', maxrel(Hdirect, R2.total) < 1e-12);
chk('volumeVelocity == p_c/Zcochlea', ...
    maxrel(R2.volumeVelocity, (R2.total/p2.N)./R2.Zcochlea) < 1e-12);

% The shunt diagnostics are COMPLEX current dividers. Their magnitude is
% NOT bounded by 1: when the two impedances are reactive with opposite
% signs they partly cancel and the ratio can exceed unity. Assert only what
% is actually true.
chk('eardrum diagnostic finite and nonzero', ...
    all(isfinite(R2.eardrum)) && all(abs(R2.eardrum) > 0));
chk('joint diagnostic finite and nonzero', ...
    all(isfinite(R2.joint)) && all(abs(R2.joint) > 0));

% Opening the joint shunt does NOT simply raise H everywhere. C_is resonates
% with the stapes + vestibular mass (L_s + L_v), and that resonance is what
% produces the second peak near 4-5 kHz in the paper's Fig. 3. Removing the
% joint destroys the peak, so H FALLS there. This is a feature of the
% circuit, not a leak.
fJoint = 1/(2*pi*sqrt((p2.L_s + p2.L_v)*p2.C_is));
chk(sprintf('joint/stapes resonance lands 4-6 kHz (%.0f Hz)', fJoint), ...
    fJoint > 4000 && fJoint < 6000);
q = p2; q.C_is = 1e-18;                       % joint becomes an open circuit
dOpen = dbv(middleEarResponse(q,f).total) - dbv(R2.total);
[worst, iw] = min(dOpen);
chk(sprintf('opening the joint LOSES gain near that resonance (%.1f dB at %.0f Hz)', ...
    worst, f(iw)), worst < -2 && f(iw) > 3500 && f(iw) < 7000);
chk('opening the joint raises H at low frequency', interp1(f, dOpen, 200) > 0);
% and the model must actually show a second peak there
gg = dbv(R2.total); band = f > 3000 & f < 7000;
chk('model has a local maximum between 3 and 7 kHz', ...
    max(gg(band)) > interp1(f,gg,3000) && max(gg(band)) > interp1(f,gg,7000));

%% ---- C. physics sanity -------------------------------------------------
fprintf('--- C. physics sanity ---\n');
Ctheory = p2.V_c/(p2.rho_a*p2.c^2);
chk(sprintf('C_cp+C_cm == V_c/(rho c^2) within 5%% (%.3e vs %.3e)', ...
    p2.C_cp+p2.C_cm, Ctheory), ...
    abs((p2.C_cp+p2.C_cm) - Ctheory)/Ctheory < 0.05);
Ltheory = (2.5e-3/p2.A_f^2)/p2.N^2;
chk(sprintf('L_s == (m/A_f^2)/T_r^2 within 10%% (%.3e vs %.3e)', ...
    p2.L_s, Ltheory), abs(p2.L_s - Ltheory)/Ltheory < 0.10);
% The paper derives R_co from a measured cochlear impedance of 0.35e11 SI.
chk(sprintf('R_co*T_r^2 == 0.35e11 Pa*s/m^3 within 5%% (%.3e)', ...
    p2.R_co*p2.N^2*p2.Z_unitToSI), ...
    abs(p2.R_co*p2.N^2*p2.Z_unitToSI - 0.35e11)/0.35e11 < 0.05);
chk('T_r == 17 and matches A_t/A_f within 2%', ...
    p2.N == 17 && abs(p2.A_t/p2.A_f - 17)/17 < 0.02);
chk('C_la read as microfarads (see MIDDLEEARPARAMS units note)', ...
    p2.C_la < 1e-5);

g = dbv(R2.total);
chk(sprintf('peak gain 19-25 dB (%.1f dB at %.0f Hz)', R2.peakGainDb, R2.fPeak), ...
    R2.peakGainDb > 19 && R2.peakGainDb < 25);
chk(sprintf('peak lies 700-2000 Hz (%.0f Hz)', R2.fPeak), ...
    R2.fPeak > 700 && R2.fPeak < 2000);
chk(sprintf('LF: 100 Hz at least 12 dB below peak (%.1f dB)', ...
    R2.peakGainDb - interp1(f,g,100)), R2.peakGainDb - interp1(f,g,100) > 12);
chk(sprintf('HF: 10 kHz at least 10 dB below peak (%.1f dB)', ...
    R2.peakGainDb - interp1(f,g,10000)), R2.peakGainDb - interp1(f,g,10000) > 10);
chk('phase leads at LF, lags at HF', ...
    angle(interp1(f, R2.total, 100)) > 0 && angle(interp1(f, R2.total, 5000)) < 0);
zdb = dbv(R2.inputImpedance);
chk('|Zin| stiffness controlled at LF', interp1(f,zdb,25) > interp1(f,zdb,50));
zSI_1k = interp1(f, abs(R2.inputImpedance), 1000)*p2.Z_unitToSI;
chk(sprintf('|Zin| at 1 kHz is 3e7-1.2e8 Pa*s/m^3 (%.2e)', zSI_1k), ...
    zSI_1k > 3e7 && zSI_1k < 1.2e8);

%% ---- D. cascade --------------------------------------------------------
fprintf('--- D. cascade ---\n');
C = combinedEarResponse(p1, p2, f);
chk('combined total finite', all(isfinite(C.total)));
chk('Htotal == Houter .* Hmiddle', maxrel(C.total, C.Houter.*C.Hmiddle) < 1e-14);
chk('loadingRatio positive and finite', ...
    all(C.loadingRatio > 0) && all(isfinite(C.loadingRatio)));
chk('default f gives 1024 points', numel(combinedEarResponse(p1,p2).f) == 1024);

%% ---- E. cavity placement ----------------------------------------------
fprintf('--- E. cavity placement (Fig. 1 = series) ---\n');
chk('default placement is series, as drawn in Fig. 1', ...
    strcmpi(p2.cavityPlacement, 'series'));
q = p2; q.cavityPlacement = 'shunt';
Rh = middleEarResponse(q, f);
chk('shunt variant still self-consistent', ...
    maxrel(Rh.cavity.*Rh.ossicles.*Rh.stapes*p2.N, Rh.total) < 1e-12);
chk('shunt cavity: cavity factor is exactly 1 (ideal source)', all(Rh.cavity == 1));
q.C_cp = p2.C_cp*3;
chk('shunt cavity: tripling C_cp leaves H untouched (E4 control)', ...
    max(abs(middleEarResponse(q,f).total - Rh.total)) < 1e-12);
q = p2; q.C_cp = p2.C_cp*3;
chk('series cavity: tripling C_cp DOES change H', ...
    max(abs(dbv(middleEarResponse(q,f).total) - dbv(R2.total))) > 0.5);
q = p2; q.cavityPlacement = 'bogus';
try
    middleEarResponse(q,f); ok = false;
catch
    ok = true;
end
chk('rejects bad cavityPlacement', ok);

%% ---- summary -----------------------------------------------------------
fprintf('\n--- key numbers ---\n');
fprintf('H_middle @ 100 Hz / 1 kHz / 10 kHz : %+.1f / %+.1f / %+.1f dB\n', ...
    interp1(f,g,100), interp1(f,g,1000), interp1(f,g,10000));
fprintf('H_middle peak                      : %+.1f dB at %.0f Hz\n', ...
    R2.peakGainDb, R2.fPeak);
fprintf('|Zin| at 100 Hz / 1 kHz            : %.2e / %.2e Pa*s/m^3\n', ...
    interp1(f,abs(R2.inputImpedance),100)*p2.Z_unitToSI, zSI_1k);
fprintf('combined peak                      : %+.1f dB at %.0f Hz\n', ...
    C.peakGainDb, C.fPeak);
fprintf('loadingRatio min/median            : %.2f / %.2f\n', ...
    min(C.loadingRatio), median(C.loadingRatio));

fprintf('\n%d checks, %d failed\n', n, fail);
if fail > 0, error('test_middleEar:failed', '%d checks failed', fail); end
end

% -------------------------------------------------------------------------
function r = maxrel(a, b)
r = max(abs(a-b)./max(abs(b), realmin));
end
function Z = par2(a, b)
Z = 1./(1./a + 1./b);
end
function Z = par3(a, b, c)
Z = 1./(1./a + 1./b + 1./c);
end
