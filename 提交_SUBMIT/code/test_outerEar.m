function test_outerEar()
%TEST_OUTEREAR  Self-checks for the outer-ear model physics.
%
%   Run with:  test_outerEar
%
%   Verifies each mechanism against an independently computed expectation,
%   including a cross-check of the IEC 318 mode against the ngspice result
%   for the same circuit (peak 5.64 kHz, +27.0 dB).

fprintf('\n=== outerEarResponse self-test ===\n\n');
nfail = 0;

f = logspace(log10(20), log10(20000), 20001).';
p = outerEarParams();

%% 1. Helmholtz resonance frequency ---------------------------------------
R = outerEarResponse(p, f);
aAp  = p.conchaAperture/2;
Aap  = pi*aAp^2;
Leff = p.conchaDepth + 1.7*aAp;
fH_expected = (p.c/(2*pi))*sqrt(Aap/(p.conchaVolume*Leff));
nfail = nfail + check('Helmholtz f_H matches formula', ...
    R.fHelmholtz, fH_expected, 1e-9);

% The 1 + (A-1)*bandpass form peaks exactly at f_H, with magnitude exactly A.
[mx, i1] = max(abs(R.concha));
nfail = nfail + check('concha peaks exactly at f_H', ...
    f(i1), fH_expected, 0.005);
nfail = nfail + check('concha peak gain = conchaGainDb', ...
    20*log10(mx), p.conchaGainDb, 0.01, true);

% Regression: the concha must return to unity gain off resonance. A plain
% second-order low-pass would roll off at 12 dB/octave above f_H and drag
% the whole combined response down, which the real concha does not do.
nfail = nfail + check('concha -> 0 dB at 20 Hz', ...
    20*log10(abs(R.concha(1))), 0, 0.2, true);
nfail = nfail + check('concha -> 0 dB at 20 kHz', ...
    20*log10(abs(R.concha(end))), 0, 1.0, true);

%% 2. Quarter-wave canal resonance ----------------------------------------
aC = p.canalDiameter/2;
Lc = p.canalLength + 0.85*aC;
f1_expected = p.c/(4*Lc);
nfail = nfail + check('canal 1st resonance matches c/4L', ...
    R.fCanal(1), f1_expected, 1e-9);

[~, i2] = max(abs(R.canal));
nfail = nfail + check('canal response peaks at c/4L', ...
    f(i2), f1_expected, 0.02);

% odd-harmonic spacing: 3rd resonance should be 3x the first
nfail = nfail + check('canal 2nd resonance is 3x the first', ...
    R.fCanal(2), 3*R.fCanal(1), 1e-9);

%% 3. Pinna reflection notch ----------------------------------------------
pn = p;
pn.pinnaStrength = 0.65;
Rn = outerEarResponse(pn, f);
% first notch: find the minimum of |pinna| near the predicted frequency
[~, i3] = min(abs(Rn.pinna));
nfail = nfail + check('pinna notch at predicted frequency', ...
    f(i3), Rn.fNotch(1), 0.02);

% Notch depth is 1 - rho_eff, where rho_eff is the frequency-dependent
% reflection coefficient evaluated at the notch.
rhoAtNotch = interp1(f, Rn.rhoEff, f(i3));
nfail = nfail + check('pinna notch depth = 1-rho_eff', ...
    min(abs(Rn.pinna)), 1-rhoAtNotch, 0.02);

% Regression: no spurious comb gain at low frequency, where the pinna is
% far too small to reflect the wavelength.
nfail = nfail + check('pinna -> 0 dB at 20 Hz', ...
    20*log10(abs(Rn.pinna(1))), 0, 0.05, true);

%% 4. Direction dependence ------------------------------------------------
% Moving the source should move the notch (this is the whole point of the
% direction-dependent spectral cue).
pa = p; pa.elevation = -40;  Ra = outerEarResponse(pa, f);
pb = p; pb.elevation =  60;  Rb = outerEarResponse(pb, f);
if abs(Ra.fNotch(1) - Rb.fNotch(1)) < 1
    fprintf('  FAIL  notch frequency does not move with elevation\n');
    nfail = nfail + 1;
else
    fprintf('  PASS  notch moves with elevation (%.0f Hz -> %.0f Hz)\n', ...
        Ra.fNotch(1), Rb.fNotch(1));
end

%% 5. IEC 318 cross-check against ngspice ---------------------------------
% Same circuit as the Part-1 homework. ngspice 47 gave a peak of
% 5636.8 Hz at +27.00 dB. The analytic transfer function must agree.
pi318 = p;
pi318.canalModel = 'iec318';
fi = logspace(log10(20), log10(20000), 200001).';
Ri = outerEarResponse(pi318, fi);
mag = 20*log10(abs(Ri.canal));
[pk, ipk] = max(mag);

nfail = nfail + check('IEC318 peak frequency vs ngspice (5636.8 Hz)', ...
    fi(ipk), 5636.8, 0.005);
nfail = nfail + check('IEC318 peak gain vs ngspice (27.00 dB)', ...
    pk, 27.00, 0.01);

% hand-calculated LC resonance for the same branch
nfail = nfail + check('IEC318 reported f0 = 1/(2*pi*sqrt(L3*C1))', ...
    Ri.fCanal(1), 1/(2*pi*sqrt(p.L3*p.C1)), 1e-9);

%% 6. Structural sanity ---------------------------------------------------
nfail = nfail + check('total = product of the four components', ...
    max(abs(R.total - R.reflector.*R.concha.*R.canal.*R.pinna)), 0, 1e-12, true);

% reflector: ~0 dB at low frequency, approaching the asymptote up high
nfail = nfail + check('reflector gain -> 0 dB at 20 Hz', ...
    20*log10(R.reflector(1)), 0, 0.01, true);

% no NaN / Inf anywhere, including at DC
Rz = outerEarResponse(p, [0; 100; 1000]);
if any(~isfinite(Rz.total))
    fprintf('  FAIL  non-finite value in response (DC guard failed)\n');
    nfail = nfail + 1;
else
    fprintf('  PASS  response finite at DC\n');
end

%% 7. Impulse response used for audio auditioning -------------------------
fsAud = 44100;
N     = 4096;
ir    = outerEarIR(p, fsAud, N);

if ~isreal(ir) || ~all(isfinite(ir)) || numel(ir) ~= N
    fprintf('  FAIL  impulse response is not real/finite/correct length\n');
    nfail = nfail + 1;
else
    fprintf('  PASS  impulse response real, finite, %d samples\n', N);
end

% Round-trip: the spectrum of the IR must reproduce the design response.
Hact = 20*log10(abs(fft(ir)) + 1e-12);
nfa  = N/2 + 1;
fa   = (0:nfa-1).'*(fsAud/N);
Rdes = outerEarResponse(p, fa);
Hdes = 20*log10(abs(Rdes.total) + 1e-12);
band = fa >= 100 & fa <= 15000;
Hhalf  = Hact(1:nfa);
devMax = max(abs(Hhalf(band) - Hdes(band)));
nfail = nfail + check('IR spectrum matches design (100 Hz-15 kHz)', ...
    devMax, 0, 0.5, true);

%% ------------------------------------------------------------------------
fprintf('\n');
if nfail == 0
    fprintf('ALL TESTS PASSED\n\n');
else
    fprintf('%d TEST(S) FAILED\n\n', nfail);
end
end

% -------------------------------------------------------------------------
function bad = check(name, got, want, tol, absolute)
%CHECK  Compare GOT against WANT to within TOL (relative unless ABSOLUTE).
if nargin < 5, absolute = false; end
if absolute
    err = abs(got - want);
    ok  = err <= tol;
    fprintf('  %s  %-52s got %.6g (want %.6g, abs err %.3g)\n', ...
        pf(ok), name, got, want, err);
else
    err = abs(got - want)/max(abs(want), eps);
    ok  = err <= tol;
    fprintf('  %s  %-52s got %.6g (want %.6g, rel err %.2g)\n', ...
        pf(ok), name, got, want, err);
end
bad = double(~ok);
end

function s = pf(ok)
if ok, s = 'PASS'; else, s = 'FAIL'; end
end
