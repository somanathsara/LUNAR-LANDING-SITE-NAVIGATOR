import { useState, useRef, useEffect } from 'react';
import { AnalysisRun } from '../types';
import Card from './Card';
import Button from './Button';
import { formatValue as formatMetricValue } from './AnalysisSummary';

interface AIExplanationViewProps {
  analysis: AnalysisRun;
  onBack: () => void;
}

const SUGGESTED_QUESTIONS = [
  "Why is the Sun elevation so low at this site?",
  "What does the Earth visibility mean for communications?",
  "How does terrain affect solar power generation?",
  "Compare this site's illumination to other polar sites",
  "What are the main limitations of this analysis?",
  "When would be the best time for a landing at this site?",
];

const DEMO_RESPONSES: Record<string, string> = {
  "Why is the Sun elevation so low at this site?": "At lunar polar regions (latitudes > 85°), the Sun remains near the horizon year-round due to the Moon's minimal axial tilt (1.5°). This creates long shadows and variable illumination. Your selected site at {lat}° latitude experiences Sun elevations typically between -5° and +5°, meaning the Sun skims the horizon. This is both a challenge (for solar power) and an opportunity (near-continuous illumination on high terrain).",
  "What does the Earth visibility mean for communications?": "Earth visibility at {earthEl}° elevation means Earth is {earthVis} above the local horizon. At polar sites, Earth appears to librate (wobble) in a small region of the sky. High Earth elevation (> 10°) enables direct-to-Earth communications with minimal relay requirements. Low or obstructed Earth visibility would require relay satellites or surface assets for continuous contact.",
  "How does terrain affect solar power generation?": "Terrain obstruction ({terrainSun}) means local topography (crater rims, mountains) blocks the Sun at certain azimuths. Even when the Sun is geometrically above the horizon (elevation > 0°), a crater wall can cast shadows. For solar power, you need both geometric visibility AND terrain clearance. The DEM-based terrain analysis shows {terrainSun} visibility — this would reduce effective illumination hours compared to geometric predictions.",
  "Compare this site's illumination to other polar sites": "Compared to other polar candidates: Shackleton Rim (~89.9°S) offers near-continuous illumination on peaks but deep PSRs in crater floors. Connecting Ridge (~89.4°S) has slightly lower latitude but favorable ridge geometry. Malapert Massif (~86°S, 5000m elevation) has high Earth visibility due to elevation. Your site at {lat}° latitude falls in the mid-range — better than deep crater floors, less optimal than peak locations.",
  "What are the main limitations of this analysis?": "Key limitations: 1) DEMO DATA — synthetic approximations, not real SPICE computations. 2) Terrain visibility uses simplified model, not actual LOLA DEM ray-tracing. 3) No uncertainty quantification on geometry results. 4) Earth libration approximated, not computed from SPICE. 5) Single timestamp analysis — no annual illumination profile. 6) No thermal, power, or communications link budget modeling.",
  "When would be the best time for a landing at this site?": "For polar sites, landing timing depends on: 1) Sun elevation — higher elevation reduces shadow hazards during descent. 2) Earth visibility — needed for real-time communications during landing. 3) Thermal conditions — avoid extreme cold of lunar night. For your site, optimal windows occur when Sun elevation > 2° AND Earth elevation > 5° simultaneously. This typically happens during specific lunar day periods — a full annual analysis would identify exact windows.",
};

function formatResponse(template: string, analysis: AnalysisRun): string {
  const sun = analysis.geometry_results.find(r => r.target === 'SUN');
  const earth = analysis.geometry_results.find(r => r.target === 'EARTH');
  const lat = analysis.input_snapshot.site.latitude_deg.toFixed(1);
  const sunEl = sun?.elevation_deg?.toFixed(1) ?? 'N/A';
  const earthEl = earth?.elevation_deg?.toFixed(1) ?? 'N/A';
  const earthVis = earth?.geometric_visible ? 'visible' : 'obstructed';
  const terrainSun = sun?.terrain_visible ?? 'unavailable';

  return template
    .replace('{lat}', lat)
    .replace('{sunEl}', sunEl)
    .replace('{earthEl}', earthEl)
    .replace('{earthVis}', earthVis)
    .replace('{terrainSun}', terrainSun);
}

export default function AIExplanationView({ analysis, onBack }: AIExplanationViewProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<Array<{ question: string; answer: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [answer, history]);

  const handleAsk = async (q?: string) => {
    const query = q || question;
    if (!query.trim()) return;

    setIsGenerating(true);
    setQuestion('');

    // Simulate AI response generation
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Find matching demo response or generate generic one
    let response = DEMO_RESPONSES[query];
    if (!response) {
      response = `Based on the analysis for ${analysis.input_snapshot.site.name} at ${analysis.timestamp_utc}:

**Sun Geometry**: Azimuth ${sun?.azimuth_deg?.toFixed(1)}°, Elevation ${sun?.elevation_deg?.toFixed(1)}° (${sun?.geometric_visible ? 'visible' : 'obstructed'} geometrically, ${sun?.terrain_visible} terrain)

**Earth Geometry**: Azimuth ${earth?.azimuth_deg?.toFixed(1)}°, Elevation ${earth?.elevation_deg?.toFixed(1)}° (${earth?.geometric_visible ? 'visible' : 'obstructed'} geometrically, ${earth?.terrain_visible} terrain)

**Key Insight**: ${analysis.limitations[0] || 'Analysis complete.'}

This explanation references only the validated metrics shown above. The AI does not perform independent scientific calculations.`;
    }

    const formattedResponse = formatResponse(response, analysis);

    setAnswer(formattedResponse);
    setHistory(prev => [...prev, { question: query, answer: formattedResponse }]);
    setIsGenerating(false);
  };

  const sun = analysis.geometry_results.find(r => r.target === 'SUN');
  const earth = analysis.geometry_results.find(r => r.target === 'EARTH');

  return (
    <div className="ai-explanation-view space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button variant="ghost" onClick={onBack} className="text-secondary hover:text-primary">
          ← Back to Analysis
        </Button>
        <div>
          <h2 className="font-semibold text-lg">AI Explanation</h2>
          <p className="text-sm text-muted">
            Grounded in analysis for {analysis.input_snapshot.site.name}
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <Card className="p-4 bg-warning/10 border-warning/30">
        <div className="flex items-start gap-3">
          <span className="text-warning text-lg" aria-hidden="true">⚠</span>
          <div>
            <p className="font-medium text-warning">AI Disclaimer</p>
            <p className="text-sm text-muted mt-1">
              This AI provides explanations grounded in the computed metrics displayed above. It does <strong>not</strong> perform scientific calculations, access external data, or validate results. All quantitative claims reference the analysis data directly. Treat explanations as interpretive assistance only.
            </p>
          </div>
        </div>
      </Card>

      {/* Context Summary */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Analysis Context</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted">Site:</span>
            <div className="font-mono text-primary">{analysis.input_snapshot.site.name}</div>
          </div>
          <div>
            <span className="text-muted">Time (UTC):</span>
            <div className="font-mono text-primary text-xs">{analysis.timestamp_utc}</div>
          </div>
          <div>
            <span className="text-muted">Sun:</span>
            <div className="font-mono text-primary">El. {formatMetricValue(sun?.elevation_deg ?? null, '°')}, Az. {formatMetricValue(sun?.azimuth_deg ?? null, '°')}</div>
          </div>
          <div>
            <span className="text-muted">Earth:</span>
            <div className="font-mono text-primary">El. {formatMetricValue(earth?.elevation_deg ?? null, '°')}, Az. {formatMetricValue(earth?.azimuth_deg ?? null, '°')}</div>
          </div>
        </div>
      </Card>

      {/* Chat History */}
      <Card className="p-4 flex-1 min-h-[300px] max-h-[400px] overflow-y-auto flex flex-col">
        <h3 className="font-semibold mb-3">Conversation</h3>

        {history.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted py-8">
            <div className="text-4xl mb-3" aria-hidden="true">🤖</div>
            <p className="mb-4">Ask a question about the analysis results</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAsk(q)}
                  className="text-xs"
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 space-y-4">
          {history.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center flex-shrink-0 text-muted text-sm" aria-hidden="true">👤</div>
                <div className="flex-1">
                  <p className="text-sm">{item.question}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0 text-accent-primary text-sm" aria-hidden="true">🤖</div>
                <div className="flex-1 prose prose-sm prose-invert max-w-none text-sm">
                  <div className="whitespace-pre-wrap">{item.answer}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div ref={messagesEndRef} />
      </Card>

      {/* Input */}
      <Card className="p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="Ask about Sun/Earth geometry, visibility, terrain effects, limitations..."
            className="input flex-1 bg-tertiary border border-secondary rounded px-3 py-2 text-primary placeholder-muted"
            disabled={isGenerating}
            aria-label="Ask AI a question"
          />
          <Button
            onClick={() => handleAsk()}
            disabled={isGenerating || !question.trim()}
            isLoading={isGenerating}
          >
            Ask
          </Button>
        </div>

        {history.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {SUGGESTED_QUESTIONS.slice(3).map((q, i) => (
              <Button
                key={i}
                variant="ghost"
                size="xs"
                onClick={() => handleAsk(q)}
                className="text-xs"
              >
                {q}
              </Button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}