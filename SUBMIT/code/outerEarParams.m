function p = outerEarParams()
%OUTEREARPARAMS  Default anatomical / acoustical parameters for the outer-ear model.
%
%   All lengths are in metres, volumes in cubic metres, angles in degrees.
%   Default values are typical adult human values taken from the ranges
%   quoted in the course notes and standard anatomy references.
%
%   See also OUTEREARRESPONSE, OUTEREARMODEL.

% ---- medium -------------------------------------------------------------
p.c    = 343;          % speed of sound in air (m/s) at ~20 C
p.rho  = 1.204;        % density of air (kg/m^3)

% ---- ear canal ----------------------------------------------------------
p.canalLength   = 0.025;    % 25 mm, entrance to eardrum
p.canalDiameter = 0.0075;   % 7.5 mm
p.canalQ        = 5;        % damping of the canal standing wave (dimensionless)
p.canalModel    = 'quarterwave';   % 'quarterwave' | 'iec318'

% Nominal geometry the IEC 318 lumped values correspond to. The circuit
% element values are scaled away from these by the canal sliders so that
% the equivalent circuit tracks the anatomy (see OUTEREARRESPONSE).
p.canalLength0   = 0.025;
p.canalDiameter0 = 0.0075;

% IEC 318 equivalent-circuit values (from the course slides).
p.L3 = 50;        p.C1 = 17.6e-12;   p.R1 = 500e6;   % ear canal branch
p.L1 = 10e3;      p.C2 = 52.8e-12;   p.R2 = 20e6;    % eardrum resonance 1
p.L2 = 500;       p.C3 = 12.7e-12;   p.R3 = 6.5e6;   % eardrum resonance 2

% ---- concha cavity (Helmholtz resonator) --------------------------------
p.conchaVolume   = 4.0e-6;   % 4 cm^3
p.conchaDepth    = 0.010;    % 10 mm  (acts as the resonator neck length)
p.conchaAperture = 0.015;    % 15 mm aperture diameter
p.conchaQ        = 3;        % sharpness of the Helmholtz resonance
p.conchaGainDb   = 6;        % boost at f_H (dB); response is 0 dB off-resonance

% ---- concha / pinna acting as a parabolic reflector ---------------------
p.reflectorDiameter = 0.025;  % 25 mm effective reflector aperture
p.reflectorGainMax  = 6;      % asymptotic high-frequency gain (dB)

% ---- pinna reflections (direction-dependent notches) --------------------
p.pinnaPathBase = 0.010;   % 10 mm base reflection path offset
p.pinnaStrength = 0.65;    % reflection coefficient, 0..1 (signed)
p.pinnaNormal   = [0.6; 0.2; 0.77];   % reflector axis, +x fwd, +y left, +z up

% ---- source direction ---------------------------------------------------
p.azimuth   = 0;    % degrees, 0 = straight ahead, +90 = toward that ear side
p.elevation = 0;    % degrees, 0 = ear level, + = above

end
