function test_combinedGui()
%TEST_COMBINEDGUI  Smoke test for the COMBINEDEARMODEL interface.
%
%   TEST_COMBINEDGUI builds the GUI, drives every slider to its minimum,
%   midpoint and maximum, fires every dropdown item, presses every button,
%   runs the sweep for all 18 parameters, and builds an impulse response for
%   each middle-ear condition. It errors if anything throws.
%
%   Run it from this folder. Same approach as TEST_GUI_SMOKE in the
%   outer-ear assignment.
%
%   See also COMBINEDEARMODEL, TEST_MIDDLEEAR.

fprintf('=== combinedEarModel GUI smoke test ===\n');
fail = 0;

try
    combinedEarModel();
    fprintf('PASS  GUI constructed\n');
catch ME
    error('test_combinedGui:construction', ...
          'GUI construction failed: %s (line %d)', ME.message, ME.stack(1).line);
end

figs = findall(groot, 'Type', 'figure');
fig  = figs(1);
cleanup = onCleanup(@() close(fig));

% ---- sliders: drive each to min, mid, max ------------------------------
sliders = findall(fig, '-isa', 'matlab.ui.control.Slider');
fprintf('      found %d sliders\n', numel(sliders));
if numel(sliders) ~= 18
    fprintf('FAIL  expected 18 sliders (14 outer + 4 middle)\n'); fail = fail + 1;
end
try
    for i = 1:numel(sliders)
        s = sliders(i);
        lims = s.Limits;
        for v = [lims(1), mean(lims), lims(2)]
            s.Value = v;
            cb = s.ValueChangedFcn;
            cb(s, struct('Value', v));
        end
    end
    fprintf('PASS  all slider callbacks (min/mid/max)\n');
catch ME
    fprintf('FAIL  slider callback: %s (line %d)\n', ME.message, ME.stack(1).line);
    fail = fail + 1;
end

% ---- dropdowns ---------------------------------------------------------
dds = findall(fig, '-isa', 'matlab.ui.control.DropDown');
try
    for i = 1:numel(dds)
        d = dds(i);
        if ~isempty(d.ValueChangedFcn)
            for j = 1:numel(d.ItemsData)
                d.Value = d.ItemsData{j};
                cb = d.ValueChangedFcn;
                cb(d, []);
            end
        end
    end
    fprintf('PASS  all dropdown callbacks (4 conditions, 2 canal models)\n');
catch ME
    fprintf('FAIL  dropdown callback: %s (line %d)\n', ME.message, ME.stack(1).line);
    fail = fail + 1;
end

% ---- buttons -----------------------------------------------------------
btns = findall(fig, '-isa', 'matlab.ui.control.Button');
for i = 1:numel(btns)
    b = btns(i);
    if any(strcmp(b.Text, {'Run sweep', 'Clear', 'Reset to defaults'}))
        try
            cb = b.ButtonPushedFcn;
            cb(b, []);
            fprintf('PASS  button "%s"\n', b.Text);
        catch ME
            fprintf('FAIL  button "%s": %s (line %d)\n', ...
                    b.Text, ME.message, ME.stack(1).line);
            fail = fail + 1;
        end
    end
end

% ---- sweep every parameter, middle-ear ones included -------------------
swp = [];
for i = 1:numel(dds)
    if any(strcmp(dds(i).ItemsData, 'L_te')), swp = dds(i); end
end
runBtn = [];
for i = 1:numel(btns)
    if strcmp(btns(i).Text, 'Run sweep'), runBtn = btns(i); end
end
try
    for j = 1:numel(swp.ItemsData)
        swp.Value = swp.ItemsData{j};
        cb = runBtn.ButtonPushedFcn;
        cb(runBtn, []);
    end
    fprintf('PASS  sweep runs for all %d parameters\n', numel(swp.ItemsData));
catch ME
    fprintf('FAIL  sweep: %s (line %d)\n', ME.message, ME.stack(1).line);
    fail = fail + 1;
end

% ---- impulse response for every condition ------------------------------
try
    p1 = outerEarParams();
    for c = {'normal', 'mild', 'moderate', 'severe'}
        if strcmp(c{1}, 'normal')
            q = middleEarParams();
        else
            q = middleEarParams('otitisMedia', c{1});
        end
        ir = combinedEarIR(p1, q, 44100, 4096);
        assert(numel(ir) == 4096 && isreal(ir) && all(isfinite(ir)), ...
               'impulse response is not a real finite 4096-point vector');
        fprintf('PASS  combinedEarIR %-9s (real, finite, peak %.3g)\n', ...
                c{1}, max(abs(ir)));
    end
catch ME
    fprintf('FAIL  impulse response: %s (line %d)\n', ME.message, ME.stack(1).line);
    fail = fail + 1;
end

fprintf('\nGUI smoke test: %d failures\n', fail);
if fail > 0
    error('test_combinedGui:failed', '%d GUI checks failed', fail);
end

end
