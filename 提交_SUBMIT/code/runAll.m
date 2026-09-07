function runAll()
%RUNALL  Run the whole middle-ear assignment in one go.
%
%   RUNALL is the only command you need. From this folder, type:
%
%       runAll
%
%   It does everything in order and leaves the figures open on screen:
%
%     1. runs the 86 verification checks          (test_middleEar)
%     2. makes figures 1-3, outer / middle / combined
%                                                 (generateCombinedFigures)
%     3. runs the four Part 4 experiments         (runMiddleEarExperiments)
%     4. runs the otitis-media extension          (runOtitisMedia)
%     5. opens all five PNGs in MATLAB windows
%
%   PNGs are written to the "figures" folder next to this one.
%
%   For the INTERACTIVE version, with live sliders for both the outer-ear
%   anatomy and the middle-ear circuit elements, a healthy/OME condition
%   menu and audio audition, run instead:
%
%       combinedEarModel
%
%   NOTE: Z_CAVITY, Z_EARDRUM, Z_OSSICLES, Z_JOINT and Z_COCHLEA are
%   FUNCTIONS THAT TAKE ARGUMENTS -- Z_ossicles(f, p2) -- so typing their
%   name on its own will error. You never need to call them by hand; RUNALL
%   and MIDDLEEARRESPONSE call them for you. To try one directly:
%
%       p2 = middleEarParams();
%       Z  = Z_ossicles(logspace(log10(20), log10(20000), 1024).', p2);
%
%   See also COMBINEDEARMODEL, TEST_MIDDLEEAR, GENERATECOMBINEDFIGURES,
%   RUNMIDDLEEAREXPERIMENTS, RUNOTITISMEDIA.

here   = fileparts(mfilename('fullpath'));
figDir = fullfile(fileparts(here), 'figures');
addpath(here);

line = @(t) fprintf('\n%s\n%s\n%s\n', repmat('=',1,66), t, repmat('=',1,66));

line('STEP 1 of 4   verification suite');
test_middleEar;

line('STEP 2 of 4   figures 1-3: outer, middle, combined');
generateCombinedFigures(figDir);

line('STEP 3 of 4   Part 4 parameter experiments (figure 4)');
runMiddleEarExperiments(figDir);

line('STEP 4 of 4   graduate extension: otitis media (figure 5)');
runOtitisMedia(figDir);

line('DONE  -- opening the figures');
pngs = {'fig1_outer_ear.png', 'fig2_middle_ear.png', 'fig3_combined.png', ...
        'fig4_experiments.png', 'fig5_otitis_media.png'};
for k = 1:numel(pngs)
    fp = fullfile(figDir, pngs{k});
    if ~exist(fp, 'file'), continue; end
    img = imread(fp);
    fg = figure('Name', pngs{k}, 'NumberTitle', 'off', 'Color', 'w', ...
                'Position', [60+18*k, 900-18*k, 900, 700]);
    ax = axes(fg, 'Position', [0 0 1 1]);
    image(ax, img); axis(ax, 'image'); axis(ax, 'off');
end

fprintf('\nAll five figures are open, and the PNGs are in:\n  %s\n', figDir);
fprintf('For the interactive version with live sliders, run:  combinedEarModel\n\n');

end
