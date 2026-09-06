function test_vsPaper()
%TEST_VSPAPER  Validate the model against Pascal et al. (1998) Figs. 2 and 3.
%
%   TEST_VSPAPER compares MIDDLEEARRESPONSE with the "Model" curves that the
%   paper itself plots, which is the only direct check that this code
%   reproduces the published circuit.
%
%   The reference points below were DIGITISED BY EYE from the scanned
%   figures and carry roughly +/-1.5 dB (Fig. 3) and +/-15% (Fig. 2) of
%   reading error, so the tolerances are loose on purpose. They are a check
%   that the topology and the referral are right, not a precision fit.
%
%   Fig. 2: z_t = p_t/u_t, plotted in Pa*s*m^-3.
%   Fig. 3: H(f) = 20*log10(p_c/p_t), p_c across the cochlear load.
%
%   See also MIDDLEEARRESPONSE, TEST_MIDDLEEAR.

p2 = middleEarParams();

% ---- Figure 3: transfer function, dB -----------------------------------
fH = [100 200 300 500 700 1000 1500 2000 2500 3000 4000 5000 6000 8000 10000].';
Hp = [4.0 10.0 13.5 18.0 21.3 22.4 22.5 19.5 17.6 18.5 20.8 20.3 18.0 12.0 8.0].';

% ---- Figure 2: input impedance, Pa*s/m^3 -------------------------------
fZ = [100 200 300 500 700 1000 1500 1800 2500 3000 4000 6000 10000].';
Zp = [3.5e8 2.0e8 1.35e8 8.5e7 6.8e7 6.0e7 6.0e7 4.2e7 8.3e7 7.5e7 5.5e7 4.2e7 4.0e7].';

R = middleEarResponse(p2, unique([fH; fZ]));
Hm = interp1(R.f, 20*log10(abs(R.total)), fH);
Zm = interp1(R.f, abs(R.inputImpedance), fZ)*p2.Z_unitToSI;

fprintf('=== Fig. 3  H(f) = 20 log10(p_c/p_t) ===\n');
fprintf('   f (Hz)    paper     model     diff\n');
for k = 1:numel(fH)
    fprintf('%9.0f  %+7.1f  %+7.1f  %+7.1f dB\n', fH(k), Hp(k), Hm(k), Hm(k)-Hp(k));
end
eH = Hm - Hp;
fprintf('  rms %.2f dB, max %.2f dB\n\n', sqrt(mean(eH.^2)), max(abs(eH)));

fprintf('=== Fig. 2  z_t = p_t/u_t  (Pa*s/m^3) ===\n');
fprintf('   f (Hz)      paper      model    ratio\n');
for k = 1:numel(fZ)
    fprintf('%9.0f  %9.2e  %9.2e  %6.2fx\n', fZ(k), Zp(k), Zm(k), Zm(k)/Zp(k));
end
eZ = 20*log10(Zm./Zp);
fprintf('  rms %.2f dB, max %.2f dB\n\n', sqrt(mean(eZ.^2)), max(abs(eZ)));

fprintf('=== qualitative features ===\n');
feat = { ...
 'H peak is 19-25 dB (paper ~22.5)',   R.peakGainDb > 19 && R.peakGainDb < 25
 'H peak lies 700-1600 Hz',            R.fPeak > 700 && R.fPeak < 1600
 'H has a local dip near 2-3 kHz',     localDip(R, 1800, 3200)
 'H recovers to >18 dB near 4 kHz',    interp1(R.f,20*log10(abs(R.total)),4000) > 18
 'H falls below 12 dB by 10 kHz',      interp1(R.f,20*log10(abs(R.total)),10000) < 12
 'phase +ve at 100 Hz, -ve above 1kHz', angle(interp1(R.f,R.total,100))>0 && ...
                                        angle(interp1(R.f,R.total,3000))<0
};
for k = 1:size(feat,1)
    if feat{k,2}, fprintf('  PASS  %s\n', feat{k,1});
    else,         fprintf('  FAIL  %s\n', feat{k,1}); end
end

fprintf('\nagreement: Fig.3 %.2f dB rms | Fig.2 %.2f dB rms\n', ...
        sqrt(mean(eH.^2)), sqrt(mean(eZ.^2)));

end

function tf = localDip(R, f1, f2)
g = 20*log10(abs(R.total));
in = R.f >= f1 & R.f <= f2;
tf = min(g(in)) < interp1(R.f, g, f1) - 0.5 && min(g(in)) < interp1(R.f, g, f2) - 0.5;
end
