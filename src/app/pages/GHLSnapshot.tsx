import { useMemo, useState } from 'react';
import { ArrowRight, Bot, Check, CheckCircle2, ChevronRight, Clock3, Copy, Database, GitBranch, Layers3, Mail, MessageSquareText, Play, Rocket, Settings2, Sparkles, Users, WandSparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';
import './GHLSnapshot.css';

type BuildModule = { title: string; description: string; icon: typeof Users; count: string; status: 'ready' | 'review' };
const modules: BuildModule[] = [
  { title: 'Contact architecture', description: 'Lifecycle fields, tags, scoring and advisor assignment.', icon: Users, count: '89 fields', status: 'ready' },
  { title: 'Pipeline engine', description: 'Lead-to-bankable opportunity stages with automated handoffs.', icon: GitBranch, count: '2 pipelines', status: 'ready' },
  { title: 'AI nurture system', description: 'Personalized SMS and email by readiness stage.', icon: Sparkles, count: '14 workflows', status: 'ready' },
  { title: 'Advisor workspace', description: 'Tasks, alerts and smart follow-up for every active client.', icon: Layers3, count: '4 dashboards', status: 'review' },
  { title: 'Appointment flow', description: 'Qualification routing, reminders and no-show recovery.', icon: Clock3, count: '3 calendars', status: 'ready' },
  { title: 'Reputation loop', description: 'Milestone-triggered review requests and referral prompts.', icon: MessageSquareText, count: '5 automations', status: 'review' },
];
const buildSteps = ['Strategy', 'Architecture', 'AI build', 'Review', 'Publish'];

export function GHLSnapshot() {
  const [activeStep, setActiveStep] = useState(2);
  const [selected, setSelected] = useState(() => new Set(modules.map(m => m.title)));
  const [prompt, setPrompt] = useState('Build a 90-day nurture sequence for business owners who scored below 650.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const progress = useMemo(() => Math.round((selected.size / modules.length) * 100), [selected]);
  const toggleModule = (title: string) => setSelected(current => { const next = new Set(current); next.has(title) ? next.delete(title) : next.add(title); return next; });
  const generate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true); setGenerated(false);
    window.setTimeout(() => { setIsGenerating(false); setGenerated(true); toast.success('AI workflow added to your snapshot'); }, 900);
  };

  return <div className="ghl-page">
    <header className="ghl-header">
      <div><div className="ghl-eyebrow"><span><Sparkles size={12} /></span> BANKABLE OS</div><h1>AI Snapshot Builder</h1><p>Turn your capital advisory process into a ready-to-deploy GoHighLevel operating system.</p></div>
      <div className="ghl-header-actions"><button className="ghl-btn ghl-btn-secondary"><Play size={15} /> Preview</button><button className="ghl-btn ghl-btn-primary" onClick={() => toast.success('Snapshot queued for publishing')}><Rocket size={15} /> Publish snapshot</button></div>
    </header>
    <section className="ghl-progress-card">
      <div className="ghl-progress-top"><div><span className="ghl-live-dot" /> Snapshot build <strong>v1.0</strong></div><span>{progress}% configured</span></div>
      <div className="ghl-steps">{buildSteps.map((step, index) => <button key={step} onClick={() => setActiveStep(index)} className={index <= activeStep ? 'complete' : ''}><span>{index < activeStep ? <Check size={13} /> : index + 1}</span>{step}{index < buildSteps.length - 1 && <i />}</button>)}</div>
    </section>
    <main className="ghl-layout">
      <section>
        <div className="ghl-section-heading"><div><h2>Snapshot architecture</h2><p>Select the systems you want packaged in this deployment.</p></div><button className="ghl-icon-btn" title="Snapshot settings"><Settings2 size={18} /></button></div>
        <div className="ghl-module-grid">{modules.map(module => { const Icon = module.icon; const isSelected = selected.has(module.title); return <button key={module.title} className={`ghl-module ${isSelected ? 'selected' : ''}`} onClick={() => toggleModule(module.title)}><div className="ghl-module-top"><span className="ghl-module-icon"><Icon size={19} /></span><span className={`ghl-check ${isSelected ? 'on' : ''}`}>{isSelected && <Check size={13} />}</span></div><h3>{module.title}</h3><p>{module.description}</p><div className="ghl-module-footer"><span>{module.count}</span><span className={module.status}>{module.status === 'ready' ? 'Ready' : 'Review'}</span></div></button> })}</div>
        <div className="ghl-readiness"><div className="ghl-readiness-score">{progress}<small>%</small></div><div><h3>Your snapshot is deployment-ready</h3><p>{selected.size} systems selected · 128 assets · Estimated setup time: 12 minutes</p></div><button className="ghl-btn ghl-btn-dark">Review build <ArrowRight size={15} /></button></div>
      </section>
      <aside className="ghl-ai-panel">
        <div className="ghl-ai-title"><span><Bot size={19} /></span><div><h2>Bankable AI</h2><p>Snapshot copilot</p></div><i>LIVE</i></div>
        <div className="ghl-ai-body"><div className="ghl-ai-message"><span className="ghl-spark"><WandSparkles size={14} /></span><div><strong>I analyzed your offer.</strong><p>I recommend a score-aware nurture workflow and an advisor alert when a lead crosses 700.</p></div></div>
          <div className="ghl-ai-insight"><div><Zap size={15} /> Suggested automation</div><h3>Readiness milestone trigger</h3><ul><li><CheckCircle2 size={14} /> Watches Bankable Score changes</li><li><CheckCircle2 size={14} /> Personalizes messaging by blocker</li><li><CheckCircle2 size={14} /> Creates advisor follow-up task</li></ul><button onClick={() => toast.success('Automation added')}><span>Add to snapshot</span><ChevronRight size={15} /></button></div>
          {generated && <div className="ghl-generated"><div><CheckCircle2 size={15} /> Workflow generated</div><strong>90-Day Readiness Accelerator</strong><p>18 touches across email and SMS, dynamically branched by score and top funding blocker.</p></div>}
        </div>
        <div className="ghl-ai-compose"><label htmlFor="ai-prompt">What should we build next?</label><textarea id="ai-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} /><div><span><Database size={13} /> Uses Bankable logic</span><button onClick={generate} disabled={isGenerating}>{isGenerating ? 'Building…' : 'Generate'} <Sparkles size={14} /></button></div></div>
      </aside>
    </main>
    <section className="ghl-assets"><div><Mail size={17} /><span><strong>38</strong> Email templates</span></div><div><MessageSquareText size={17} /><span><strong>22</strong> SMS templates</span></div><div><GitBranch size={17} /><span><strong>14</strong> Workflows</span></div><div><Copy size={17} /><span><strong>89</strong> Custom fields</span></div></section>
  </div>;
}
