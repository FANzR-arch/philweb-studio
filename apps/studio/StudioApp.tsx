import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CARD_TINT_SLOTS, FONT_PRESETS, IDENTITY_ICON_OPTIONS, METRIC_ICONS, STYLE_PACKS, TIMELINE_ICONS } from '../../lib/studio/constants';
import { cloneJson, createId } from '../../lib/studio/clone';
import { postTo, readStudioMessage, STUDIO_MESSAGE } from '../../lib/studio/messages';
import { applyAppearance, applyStylePack, readAppearance } from '../../lib/studio/theme-apply';
import { assertAvailableProjectId, computeChecklist, localDateStamp, nextBlogPostId } from '../../lib/studio/project-ops';
import type { ContentLang, InteractionMode, PreviewMode, StudioProjectV1, StudioTab } from '../../lib/studio/types';
import { Icon } from './icons';
import { flashField, resolveEditTarget } from './editJump';
import { useStudioController } from './useStudioController';

const TABS: Array<{ id: StudioTab; label: string; icon: string }> = [
  { id: 'basic', label: '基本信息', icon: 'user' },
  { id: 'home', label: '首页内容', icon: 'filetext' },
  { id: 'resume', label: '简历', icon: 'filetext' },
  { id: 'contact', label: '联系方式', icon: 'link' },
  { id: 'skills', label: '技能', icon: 'grid' },
  { id: 'theme', label: '外观风格', icon: 'palette' },
  { id: 'projects', label: '项目作品', icon: 'grid' },
  { id: 'blog', label: '博客文章', icon: 'pen' },
  { id: 'help', label: '帮助与导出', icon: 'help' },
];

function statusLabel(status: string) {
  if (status === 'dirty') return '未保存';
  if (status === 'saving') return '保存中';
  if (status === 'error') return '保存失败';
  if (status === 'saved' || status === 'clean') return '已保存';
  return '加载中';
}

function moveItem<T>(list: T[], index: number, delta: number): T[] {
  const next = [...list];
  const target = index + delta;
  if (target < 0 || target >= next.length) return next;
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export const StudioApp: React.FC = () => {
  const studio = useStudioController();
  const { project, starter, mediaUrls, updateProject, flushSave, status } = studio;
  const [tab, setTab] = useState<StudioTab>('basic');
  const [lang, setLang] = useState<ContentLang>('zh');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [interaction, setInteraction] = useState<InteractionMode>('edit');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [blogId, setBlogId] = useState<string | null>(null);
  const [iconPick, setIconPick] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);

  const sendProject = useCallback(() => {
    const frame = iframeRef.current?.contentWindow;
    if (!frame || !project || !readyRef.current) return;
    postTo(frame, { type: STUDIO_MESSAGE.PROJECT_UPDATE, project, lang });
    postTo(frame, { type: STUDIO_MESSAGE.SET_EDIT_MODE, mode: interaction });
  }, [interaction, lang, project]);

  useEffect(() => { sendProject(); }, [sendProject]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = readStudioMessage(event, iframeRef.current?.contentWindow || null);
      if (!message) return;
      if (message.type === STUDIO_MESSAGE.PREVIEW_READY) {
        readyRef.current = true;
        sendProject();
      }
      if (message.type === STUDIO_MESSAGE.EDIT_TARGET) {
        const jump = resolveEditTarget(message.field);
        if (jump.lang && message.lang) {
          void flushSave();
          setLang(message.lang);
        }
        setTab(jump.tab);
        if (jump.projectId) setProjectId(jump.projectId);
        if (jump.blogId) setBlogId(jump.blogId);
        window.setTimeout(() => flashField(jump.fieldId), 50);
      }
      if (message.type === STUDIO_MESSAGE.LANG_CHANGE) {
        setLang(message.lang);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [flushSave, sendProject]);

  const switchLang = async (next: ContentLang) => {
    if (next === lang) return;
    await flushSave();
    setLang(next);
    updateProject((current) => ({ ...current, editor: { ...current.editor, contentLang: next } }));
  };

  if (!project || !starter) {
    return <div className="studio-loading">{studio.error || '正在打开 PhilWeb Studio…'}</div>;
  }

  const home = project.home[lang];
  const resume = project.resume[lang];
  const contact = project.contact[lang];
  const appearance = readAppearance(project.theme);
  const checklist = computeChecklist(project, starter);
  const currentProject = project.projects.find((item) => item.id === projectId) || project.projects[0];
  const currentPost = project.blog.posts.find((item) => item.id === blogId || item.date === blogId) || project.blog.posts[0];

  const urlOf = (id?: string) => (id ? mediaUrls[id] : undefined);

  const Field: React.FC<{ id?: string; label: string; children: React.ReactNode }> = ({ id, label, children }) => (
    <label className="field" id={id}><span>{label}</span>{children}</label>
  );

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <h1><Icon name="sparkles" />PhilWeb Studio</h1>
        <span className="hint">左侧编辑，右侧实时预览 · 数据只保存在当前浏览器</span>
        <span className="spacer" />
        <span className={`save-status ${status}`}>{statusLabel(status)}</span>
        <button className="btn small" onClick={() => void studio.doExportWebsite()}><Icon name="package" />检查并导出网站</button>
        <button className="btn ghost small" onClick={() => void studio.restoreSession()}><Icon name="undo" />撤销本次修改</button>
      </header>
      <div className="studio-main">
        <nav className="studio-nav" id="nav">
          {TABS.map((item) => (
            <button key={item.id} data-tab={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
              <Icon name={item.icon} />{item.label}
            </button>
          ))}
          <button id="quick-save" className="quick-save" onClick={() => void flushSave()} disabled={status === 'saving'}>
            <Icon name="save" />保存当前页
          </button>
        </nav>
        <div className="panel">
          {!checklist.hidden && (
            <div className="card">
              <div className="check-head">
                <b>{checklist.items.every((item) => item.done) ? '全部完成！' : '定制进度'}</b>
                <div className="bar"><i style={{ width: `${Math.round((checklist.items.filter((i) => i.done).length / checklist.items.length) * 100)}%` }} /></div>
                <button onClick={() => updateProject((cur) => ({ ...cur, editor: { ...cur.editor, checklist: { ...cur.editor.checklist, hidden: true } } }))}><Icon name="x" /></button>
              </div>
              <div className="check-items">
                {checklist.items.map((item) => (
                  <button key={item.key} className={item.done ? 'done' : ''} onClick={() => setTab(item.tab)}>{item.label}</button>
                ))}
              </div>
            </div>
          )}
          {studio.storageWarn && <div className="card help"><p>浏览器存储接近上限，请先导出工程备份，避免数据丢失。</p></div>}

          {tab === 'basic' && (
            <>
              <div className="card" id="tab-basic">
                <h2><Icon name="user" />我是谁</h2>
                <p className="desc">联系方式会出现在联系弹窗。名字在「首页内容」里改。</p>
                <div className="row">
                  <Field id="b-wechatId" label="微信号"><input value={project.basic.wechatId} onChange={(e) => updateProject((c) => ({ ...c, basic: { ...c.basic, wechatId: e.target.value } }))} /></Field>
                  <Field label="邮箱"><input value={project.basic.email} onChange={(e) => updateProject((c) => ({ ...c, basic: { ...c.basic, email: e.target.value } }))} /></Field>
                </div>
                {(['x', 'xiaohongshu', 'github'] as const).map((key) => (
                  <div className="row" key={key}>
                    <Field label={key === 'x' ? 'X 主页链接' : key === 'xiaohongshu' ? '小红书主页链接' : 'GitHub 主页链接'}>
                      <input value={project.basic[key]} onChange={(e) => updateProject((c) => ({ ...c, basic: { ...c.basic, [key]: e.target.value } }))} />
                    </Field>
                    <Field label="显示账号">
                      <input value={project.basic.socialText[key]} onChange={(e) => updateProject((c) => ({ ...c, basic: { ...c.basic, socialText: { ...c.basic.socialText, [key]: e.target.value } } }))} />
                    </Field>
                  </div>
                ))}
              </div>
              <div className="card">
                <h2><Icon name="image" />我的图片</h2>
                <div className="upload-grid">
                  {([
                    ['avatarLight', '头像（浅色）', 'user'],
                    ['avatarDark', '头像（深色）', 'moon'],
                    ['wechatQr', '微信二维码', 'qrcode'],
                    ['brandMark', '个人 Logo', 'sparkles'],
                  ] as const).map(([role, label, icon]) => (
                    <div key={role} className="upload-box" id={`img-${role}`} onClick={() => pickAndUpload(role)}>
                      {urlOf(project.basic[role]) ? <img src={urlOf(project.basic[role])} alt="" /> : <div className="ph"><Icon name={icon} /></div>}
                      {label}
                    </div>
                  ))}
                </div>
                <p className="muted-note"><button className="btn ghost small" onClick={() => updateProject((c) => ({ ...c, basic: { ...c.basic, brandMark: undefined } }))}>移除 Logo</button></p>
              </div>
            </>
          )}

          {tab === 'home' && (
            <>
              <div className="lang-tabs">
                <button className={lang === 'zh' ? 'on' : ''} onClick={() => void switchLang('zh')}>中文</button>
                <button className={lang === 'en' ? 'on' : ''} onClick={() => void switchLang('en')}>English</button>
              </div>
              <div className="card">
                <h2><Icon name="filetext" />首屏与侧边栏</h2>
                <Field id="h-greeting" label="首屏大标题"><input value={home.hero.greeting} onChange={(e) => patchHome({ hero: { ...home.hero, greeting: e.target.value } })} /></Field>
                <Field id="h-description" label="首屏一句话介绍"><textarea value={home.hero.description} onChange={(e) => patchHome({ hero: { ...home.hero, description: e.target.value } })} /></Field>
                <Field id="h-name" label="侧边栏名字"><input value={home.sidebar.name} onChange={(e) => patchHome({ sidebar: { ...home.sidebar, name: e.target.value, targetRoleValue: e.target.value } })} /></Field>
                <div className="row">
                  <Field id="h-city" label="城市"><input value={home.sidebar.targetCityValue} onChange={(e) => patchHome({ sidebar: { ...home.sidebar, targetCityValue: e.target.value } })} /></Field>
                  <Field id="h-mbti" label="MBTI · 可留空"><input value={home.sidebar.mbti} onChange={(e) => patchHome({ sidebar: { ...home.sidebar, mbti: e.target.value } })} /></Field>
                </div>
                <Field id="h-experience" label="一句话经历"><input value={home.sidebar.experience} onChange={(e) => patchHome({ sidebar: { ...home.sidebar, experience: e.target.value } })} /></Field>
                <Field id="h-profileStatement" label="个人签名"><input value={home.sidebar.profileStatement} onChange={(e) => patchHome({ sidebar: { ...home.sidebar, profileStatement: e.target.value } })} /></Field>
                <label className="field"><span>技能 / 身份列表</span></label>
                <div className="identity-list" id="identity-list">
                  {home.sidebar.skillList.map((text, index) => (
                    <div className="identity-item" key={`${index}-${home.sidebar.skillIcons[index]}`}>
                      <label className={`identity-icon-picker ${home.sidebar.skillIcons[index] ? '' : 'add'}`} title="选择图标">
                        <span className="material-symbols-outlined">{home.sidebar.skillIcons[index] || 'add'}</span>
                        <select value={home.sidebar.skillIcons[index] || ''} onChange={(e) => patchIdentities(home.sidebar.skillList, home.sidebar.skillIcons.map((icon, i) => i === index ? e.target.value : icon))}>
                          <option value="">添加图标</option>
                          {IDENTITY_ICON_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                      <input className="identity-text" value={text} placeholder="例如：内容创作者" onChange={(e) => patchIdentities(home.sidebar.skillList.map((item, i) => i === index ? e.target.value : item), home.sidebar.skillIcons)} />
                      <div className="identity-actions">
                        <button type="button" onClick={() => patchIdentities(moveItem(home.sidebar.skillList, index, -1), moveItem(home.sidebar.skillIcons, index, -1))}><Icon name="up" /></button>
                        <button type="button" onClick={() => patchIdentities(moveItem(home.sidebar.skillList, index, 1), moveItem(home.sidebar.skillIcons, index, 1))}><Icon name="down" /></button>
                        <button type="button" onClick={() => { updateProject((c) => c, { history: true }); patchIdentities(home.sidebar.skillList.filter((_, i) => i !== index), home.sidebar.skillIcons.filter((_, i) => i !== index)); }}><Icon name="trash" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className="btn ghost small identity-add" onClick={() => patchIdentities([...home.sidebar.skillList, ''], [...home.sidebar.skillIcons, IDENTITY_ICON_OPTIONS[home.sidebar.skillList.length % IDENTITY_ICON_OPTIONS.length][0]])}><Icon name="plus" />添加一个身份</button>
                <Field id="h-skillTags" label="技能标签（用逗号分隔）"><input value={home.sidebar.skillTags.join('，')} onChange={(e) => patchHome({ sidebar: { ...home.sidebar, skillTags: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) } })} /></Field>
              </div>
              <div className="card" id="timeline-editor">
                <h2><Icon name="clock" />成长轨迹</h2>
                {home.timeline.items.map((item, index) => (
                  <div className="tl-item" key={item.id}>
                    <div className="tl-head">
                      <button className="tl-icon-btn" onClick={() => setIconPick(iconPick === item.id ? null : item.id)}><span className="material-symbols-outlined">{item.icon}</span></button>
                      <input value={item.period} onChange={(e) => patchTimeline(index, { period: e.target.value })} placeholder="时期" />
                      <div className="tl-ops">
                        <button onClick={() => patchHome({ timeline: { ...home.timeline, items: moveItem(home.timeline.items, index, -1) } })}><Icon name="up" /></button>
                        <button onClick={() => patchHome({ timeline: { ...home.timeline, items: moveItem(home.timeline.items, index, 1) } })}><Icon name="down" /></button>
                        <button onClick={() => { updateProject((c) => c, { history: true }); patchHome({ timeline: { ...home.timeline, items: home.timeline.items.filter((_, i) => i !== index) } }); }}><Icon name="trash" /></button>
                      </div>
                    </div>
                    {iconPick === item.id && (
                      <div className="icon-picker open">
                        {TIMELINE_ICONS.map((icon) => (
                          <button key={icon} className={item.icon === icon ? 'on' : ''} onClick={() => { patchTimeline(index, { icon }); setIconPick(null); }}>
                            <span className="material-symbols-outlined">{icon}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <Field label="标题"><input value={item.title} onChange={(e) => patchTimeline(index, { title: e.target.value })} /></Field>
                    <Field label="描述"><textarea value={item.detail} onChange={(e) => patchTimeline(index, { detail: e.target.value })} /></Field>
                  </div>
                ))}
                <button className="btn ghost small" onClick={() => patchHome({ timeline: { ...home.timeline, items: [...home.timeline.items, { id: createId('tl'), icon: 'star', period: '', title: '', keywords: [], detail: '' }] } })}><Icon name="plus" />添加一段经历</button>
              </div>
              <div className="card" id="metrics-editor">
                <h2><Icon name="grid" />数据指标</h2>
                {(home.metrics || []).map((metric, index) => (
                  <div className="row" key={`${metric.label}-${index}`}>
                    <Field label="标题"><input value={metric.label} onChange={(e) => patchMetrics(index, { label: e.target.value })} /></Field>
                    <Field label="数值"><input value={metric.value} onChange={(e) => patchMetrics(index, { value: e.target.value })} /></Field>
                    <Field label="图标">
                      <select value={metric.icon || 'star'} onChange={(e) => patchMetrics(index, { icon: e.target.value })}>
                        {METRIC_ICONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                      </select>
                    </Field>
                  </div>
                ))}
              </div>
              <div className="card">
                <h2><Icon name="pen" />板块标题与页脚</h2>
                <div className="row">
                  <Field id="h-blogTitle" label="文章板块标题"><input value={home.quickLinks.blog} onChange={(e) => patchHome({ quickLinks: { ...home.quickLinks, blog: e.target.value } })} /></Field>
                  <Field id="h-projectTitle" label="作品板块标题"><input value={home.projectSection.title} onChange={(e) => patchHome({ projectSection: { ...home.projectSection, title: e.target.value } })} /></Field>
                </div>
                <div className="row">
                  <Field id="h-timelineTitle" label="时间线板块标题"><input value={home.timeline.title} onChange={(e) => patchHome({ timeline: { ...home.timeline, title: e.target.value } })} /></Field>
                  <Field label="联系按钮文字"><input value={home.quickLinks.contact} onChange={(e) => patchHome({ quickLinks: { ...home.quickLinks, contact: e.target.value }, sidebar: { ...home.sidebar, explore: e.target.value } })} /></Field>
                </div>
                <Field id="h-footerStyle" label="页脚标语"><input value={home.footer.style} onChange={(e) => patchHome({ footer: { ...home.footer, style: e.target.value, copyright: home.sidebar.name } })} /></Field>
              </div>
            </>
          )}

          {tab === 'resume' && (
            <div className="card" id="tab-resume">
              <div className="lang-tabs">
                <button className={lang === 'zh' ? 'on' : ''} onClick={() => void switchLang('zh')}>中文</button>
                <button className={lang === 'en' ? 'on' : ''} onClick={() => void switchLang('en')}>English</button>
              </div>
              <h2><Icon name="filetext" />简历</h2>
              <Field label="姓名"><input value={resume.name} onChange={(e) => patchResume({ name: e.target.value })} /></Field>
              <Field label="标题"><input value={resume.heading} onChange={(e) => patchResume({ heading: e.target.value })} /></Field>
              <Field label="摘要"><textarea value={resume.summary} onChange={(e) => patchResume({ summary: e.target.value })} /></Field>
              <Field label="自我介绍"><textarea value={resume.statement} onChange={(e) => patchResume({ statement: e.target.value })} /></Field>
              <Field label="核心能力（一行一项）"><textarea value={resume.strengths.join('\n')} onChange={(e) => patchResume({ strengths: e.target.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) })} /></Field>
              {resume.experiences.map((exp, index) => (
                <div className="tl-item" key={`${exp.company}-${index}`}>
                  <div className="row">
                    <Field label="组织"><input value={exp.company} onChange={(e) => patchExperience(index, { company: e.target.value })} /></Field>
                    <Field label="角色"><input value={exp.role} onChange={(e) => patchExperience(index, { role: e.target.value })} /></Field>
                  </div>
                  <Field label="时期"><input value={exp.period} onChange={(e) => patchExperience(index, { period: e.target.value })} /></Field>
                  <Field label="要点（一行一项）"><textarea value={exp.bullets.join('\n')} onChange={(e) => patchExperience(index, { bullets: e.target.value.split(/\r?\n/).filter(Boolean) })} /></Field>
                  <button className="btn ghost small" onClick={() => { updateProject((c) => c, { history: true }); patchResume({ experiences: resume.experiences.filter((_, i) => i !== index) }); }}>删除这段经历</button>
                </div>
              ))}
              <button className="btn ghost small" onClick={() => patchResume({ experiences: [...resume.experiences, { company: '', role: '', period: '', bullets: [] }] })}><Icon name="plus" />添加经历</button>
            </div>
          )}

          {tab === 'contact' && (
            <div className="card">
              <div className="lang-tabs">
                <button className={lang === 'zh' ? 'on' : ''} onClick={() => void switchLang('zh')}>中文</button>
                <button className={lang === 'en' ? 'on' : ''} onClick={() => void switchLang('en')}>English</button>
              </div>
              <h2><Icon name="link" />联系弹窗文案</h2>
              <Field label="卡片标题"><input value={contact.wechatCardTitle} onChange={(e) => patchContact({ wechatCardTitle: e.target.value })} /></Field>
              <Field label="说明"><textarea value={contact.wechatDescription} onChange={(e) => patchContact({ wechatDescription: e.target.value })} /></Field>
              <Field label="微信号标签"><input value={contact.wechatIdLabel} onChange={(e) => patchContact({ wechatIdLabel: e.target.value })} /></Field>
              <Field label="扫码提示"><input value={contact.scanHint} onChange={(e) => patchContact({ scanHint: e.target.value })} /></Field>
              <p className="muted-note">账号链接请到「基本信息」修改，会同步到这里。</p>
            </div>
          )}

          {tab === 'skills' && (
            <div className="card" id="tab-skills">
              <h2><Icon name="grid" />技能矩阵</h2>
              <Field label="中文标题"><input value={project.skills.dashboard.title.zh} onChange={(e) => patchSkillsTitle('zh', e.target.value)} /></Field>
              <Field label="英文标题"><input value={project.skills.dashboard.title.en} onChange={(e) => patchSkillsTitle('en', e.target.value)} /></Field>
              {project.skills.dashboard.categories.map((category, cIndex) => (
                <div className="tl-item" key={category.id}>
                  <Field label="分类中文"><input value={category.title.zh} onChange={(e) => patchSkillCategory(cIndex, { title: { ...category.title, zh: e.target.value } })} /></Field>
                  <Field label="分类英文"><input value={category.title.en} onChange={(e) => patchSkillCategory(cIndex, { title: { ...category.title, en: e.target.value } })} /></Field>
                  {category.tools.map((tool) => (
                    <div className="row" key={tool.id}>
                      <Field label="工具名"><input value={tool.name} onChange={(e) => patchTool(cIndex, tool.id, { name: e.target.value })} /></Field>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {tab === 'theme' && (
            <div id="tab-theme">
              <div className="card">
                <h2><Icon name="palette" />整套风格包</h2>
                <div className="pack-grid" id="style-packs">
                  {STYLE_PACKS.map((pack) => (
                    <div key={pack.id} className="pack" onClick={() => updateProject((c) => applyStylePack(c, pack))}>
                      <div className="strip" style={{ borderRadius: Math.min(10, pack.radius * 0.4) }}>
                        <i style={{ background: pack.pageLight }} /><i style={{ background: pack.accentLight }} /><i style={{ background: pack.accentDark }} /><i style={{ background: pack.pageDark }} />
                      </div>
                      <div className="nm">{pack.name}</div>
                      <div className="ft">{pack.font}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h2><Icon name="save" />我的方案</h2>
                <div className="pack-grid">
                  {project.editor.customPacks.map((pack) => (
                    <div key={pack.id} className="pack" onClick={() => updateProject((c) => applyStylePack(c, pack))}>
                      <div className="strip"><i style={{ background: pack.pageLight }} /><i style={{ background: pack.accentLight }} /></div>
                      <div className="nm">{pack.name}</div>
                    </div>
                  ))}
                </div>
                <button className="btn ghost small" onClick={() => {
                  const name = window.prompt('给这套方案取个名字（20 字以内）：');
                  if (!name?.trim()) return;
                  const current = readAppearance(project.theme);
                  updateProject((c) => ({
                    ...c,
                    editor: {
                      ...c.editor,
                      customPacks: [...c.editor.customPacks, {
                        id: `custom-${Date.now().toString(36)}`,
                        name: name.trim().slice(0, 20),
                        ...current,
                        tints: current.cardTints,
                      }],
                    },
                  }));
                }}><Icon name="plus" />把当前设置保存为方案</button>
              </div>
              <div className="card" id="theme-background-editor">
                <h2><Icon name="image" />页面背景</h2>
                <div className="row">
                  <Field label="背景内容">
                    <select value={appearance.backgroundMode} onChange={(e) => patchAppearance({ backgroundMode: e.target.value })}>
                      <option value="default">默认主题</option>
                      <option value="image">自己上传的图片</option>
                      <option value="video">自己上传的视频</option>
                    </select>
                  </Field>
                  <Field label="细节图案">
                    <select id="t-background-pattern" value={appearance.backgroundPattern} onChange={(e) => patchAppearance({ backgroundPattern: e.target.value })}>
                      <option value="grid">细网格</option>
                      <option value="dots">点阵</option>
                      <option value="none">无图案</option>
                    </select>
                  </Field>
                </div>
                <div className="slider-row"><span className="lbl">网格间距</span><input type="range" min={20} max={100} step={4} value={appearance.backgroundGridSize} onChange={(e) => patchAppearance({ backgroundGridSize: Number(e.target.value) })} /><output>{appearance.backgroundGridSize}px</output></div>
                <div className="slider-row"><span className="lbl">点阵间距</span><input type="range" min={10} max={48} step={2} value={appearance.backgroundDotSize} onChange={(e) => patchAppearance({ backgroundDotSize: Number(e.target.value) })} /><output>{appearance.backgroundDotSize}px</output></div>
                <div className="color-row"><span>图案颜色</span><input type="color" value={appearance.backgroundColor} onChange={(e) => patchAppearance({ backgroundColor: e.target.value })} /><input type="text" value={appearance.backgroundColor} onChange={(e) => patchAppearance({ backgroundColor: e.target.value })} /></div>
                <div className="slider-row"><span className="lbl">图案深浅</span><input type="range" min={5} max={80} step={5} value={Math.round(appearance.backgroundOpacity * 100)} onChange={(e) => patchAppearance({ backgroundOpacity: Number(e.target.value) / 100 })} /><output>{Math.round(appearance.backgroundOpacity * 100)}%</output></div>
                <div className="row">
                  <button className="btn ghost" type="button" onClick={() => pickAndUpload('backgroundImage')}><Icon name="image" />上传背景图片</button>
                  <button className="btn ghost" type="button" onClick={() => pickAndUpload('backgroundVideo')}><Icon name="play" />上传背景视频</button>
                </div>
                <div className="background-preview">
                  <div>{urlOf(project.shared.assets.backgroundImage) ? <img src={urlOf(project.shared.assets.backgroundImage)} alt="" /> : '还没有背景图片'}</div>
                  <div>{urlOf(project.shared.assets.backgroundVideo) ? <video src={urlOf(project.shared.assets.backgroundVideo)} muted /> : '还没有背景视频'}</div>
                </div>
              </div>
              <details className="adv-panel">
                <summary><Icon name="sliders" />高级微调（可选）</summary>
                <div className="card">
                  <div className="color-row"><span>主色（浅色模式）</span><input type="color" value={appearance.accentLight} onChange={(e) => patchAppearance({ accentLight: e.target.value })} /><input type="text" value={appearance.accentLight} onChange={(e) => patchAppearance({ accentLight: e.target.value })} /></div>
                  <div className="color-row"><span>主色（深色模式）</span><input type="color" value={appearance.accentDark} onChange={(e) => patchAppearance({ accentDark: e.target.value })} /><input type="text" value={appearance.accentDark} onChange={(e) => patchAppearance({ accentDark: e.target.value })} /></div>
                  <div className="slider-row"><span className="lbl">卡片圆角</span><input type="range" min={0} max={48} step={2} value={appearance.radius} onChange={(e) => patchAppearance({ radius: Number(e.target.value) })} /><output>{appearance.radius}px</output><div className="radius-demo" style={{ borderRadius: Math.min(18, appearance.radius * 0.55) }} /></div>
                  <div className="slider-row"><span className="lbl">背景光晕强度</span><input type="range" min={0} max={200} step={5} value={appearance.aurora} onChange={(e) => patchAppearance({ aurora: Number(e.target.value) })} /><output>{appearance.aurora}%</output></div>
                  <div className="color-row"><span>页面底色（浅色）</span><input type="color" value={appearance.pageLight} onChange={(e) => patchAppearance({ pageLight: e.target.value })} /></div>
                  <div className="color-row"><span>页面底色（深色）</span><input type="color" value={appearance.pageDark} onChange={(e) => patchAppearance({ pageDark: e.target.value })} /></div>
                  <div className="row">
                    <Field label="字体">
                      <select value={appearance.fontPreset} onChange={(e) => patchAppearance({ fontPreset: e.target.value })}>
                        {Object.entries(FONT_PRESETS).map(([id, preset]) => <option key={id} value={id}>{preset.label}</option>)}
                      </select>
                    </Field>
                    <Field label="页面疏密">
                      <select value={appearance.density} onChange={(e) => patchAppearance({ density: e.target.value })}>
                        <option value="compact">紧凑</option>
                        <option value="normal">标准</option>
                        <option value="relaxed">宽松</option>
                      </select>
                    </Field>
                  </div>
                  <div className="row">
                    <Field label="阴影风格">
                      <select value={appearance.shadowStyle} onChange={(e) => patchAppearance({ shadowStyle: e.target.value })}>
                        <option value="soft">柔和投影（默认）</option>
                        <option value="hard">硬边色块（粗野主义）</option>
                        <option value="none">无阴影</option>
                      </select>
                    </Field>
                    <div className="switch-row"><div className="sw-label"><b>卡片浮动动画</b></div><label className="switch"><input type="checkbox" checked={appearance.float} onChange={(e) => patchAppearance({ float: e.target.checked })} /><i /></label></div>
                  </div>
                  <div className="switch-row"><div className="sw-label"><b>液态玻璃质感</b></div><label className="switch"><input type="checkbox" checked={appearance.glass} onChange={(e) => patchAppearance({ glass: e.target.checked })} /><i /></label></div>
                  <div className="slider-row"><span className="lbl">色调浓度</span><input type="range" min={20} max={90} step={5} value={Math.round(appearance.tintOpacity * 100)} onChange={(e) => patchAppearance({ tintOpacity: Number(e.target.value) / 100 })} /><output>{Math.round(appearance.tintOpacity * 100)}%</output></div>
                  {CARD_TINT_SLOTS.map((slot) => (
                    <div className="color-row" key={slot.key}>
                      <span>{slot.label}</span>
                      <input type="color" value={appearance.cardTints[slot.key] || '#94A3B8'} onChange={(e) => patchAppearance({ cardTints: { ...appearance.cardTints, [slot.key]: e.target.value } })} />
                      <input type="text" value={appearance.cardTints[slot.key] || ''} placeholder="跟随主题" onChange={(e) => patchAppearance({ cardTints: { ...appearance.cardTints, [slot.key]: e.target.value } })} />
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {tab === 'projects' && (
            <div>
              <div className="chips" id="project-chips">
                {project.projects.map((item) => (
                  <button key={item.id} className={(currentProject?.id === item.id) ? 'on' : ''} onClick={() => setProjectId(item.id)}>{item.locales?.zh?.title || item.title}</button>
                ))}
                <button onClick={createProject}><Icon name="plus" />新建</button>
              </div>
              {currentProject && (
                <div className="card" id="project-form">
                  <h2>编辑项目</h2>
                  <div className="lang-tabs">
                    <button className={lang === 'zh' ? 'on' : ''} onClick={() => void switchLang('zh')}>中文</button>
                    <button className={lang === 'en' ? 'on' : ''} onClick={() => void switchLang('en')}>English</button>
                  </div>
                  <Field label="标题"><input value={currentProject.locales?.[lang]?.title || currentProject.title} onChange={(e) => patchProjectLocale(currentProject.id, { title: e.target.value })} /></Field>
                  <Field label="副标题"><input value={currentProject.locales?.[lang]?.subtitle || ''} onChange={(e) => patchProjectLocale(currentProject.id, { subtitle: e.target.value })} /></Field>
                  <Field label="描述"><textarea value={currentProject.locales?.[lang]?.description || ''} onChange={(e) => patchProjectLocale(currentProject.id, { description: e.target.value })} /></Field>
                  <div className="row">
                    <Field label="年份"><input value={currentProject.year} onChange={(e) => patchProjectMeta(currentProject.id, { year: e.target.value })} /></Field>
                    <Field label="主题色"><input type="color" value={currentProject.themeColor || '#94A3B8'} onChange={(e) => patchProjectMeta(currentProject.id, { themeColor: e.target.value })} /></Field>
                  </div>
                  <div className="upload-grid">
                    <div className="upload-box" id="img-coverLight" onClick={() => uploadProjectAsset(currentProject.id, 'coverLight')}><img src={urlOf(currentProject.assets?.coverLight || currentProject.cover)} alt="" />封面（浅色）</div>
                    <div className="upload-box" onClick={() => uploadProjectAsset(currentProject.id, 'coverDark')}>封面（深色）</div>
                  </div>
                  <div className="save-row">
                    <button className="btn ghost" onClick={() => { updateProject((c) => c, { history: true }); updateProject((c) => ({ ...c, projects: c.projects.filter((item) => item.id !== currentProject.id) })); }}>删除项目</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'blog' && (
            <>
              <div className="card">
                <h2><Icon name="pen" />文章列表</h2>
                <div className="post-list" id="post-list">
                  {project.blog.posts.map((post) => (
                    <div key={post.id} className={`post-item ${currentPost?.id === post.id ? 'on' : ''}`} onClick={() => setBlogId(post.id)}>
                      <span className="date">{post.date || post.id}</span>
                      <span className="title">{post.title}</span>
                    </div>
                  ))}
                </div>
                <button className="btn ghost" onClick={createPost}><Icon name="plus" />新建文章</button>
              </div>
              {currentPost && (
                <div className="card">
                  <h2>编辑文章</h2>
                  <div className="row">
                    <Field label="日期"><input id="bl-date" type="date" value={currentPost.date || currentPost.id.slice(0, 10)} onChange={(e) => patchPost(currentPost.id, { date: e.target.value })} /></Field>
                    <Field label="分类">
                      <select id="bl-category" value={currentPost.categoryId || ''} onChange={(e) => patchPost(currentPost.id, { categoryId: e.target.value })}>
                        {project.blog.categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.title.zh}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field id="bl-title" label="标题"><input value={currentPost.title} onChange={(e) => patchPost(currentPost.id, { title: e.target.value })} /></Field>
                  <Field label="摘要"><textarea value={currentPost.summary} onChange={(e) => patchPost(currentPost.id, { summary: e.target.value })} /></Field>
                  <div className="upload-box" style={{ width: 140 }} onClick={() => uploadBlogCover(currentPost.id)}>
                    {urlOf(currentPost.cover) ? <img src={urlOf(currentPost.cover)} alt="" /> : <div className="ph"><Icon name="image" /></div>}
                    封面图
                  </div>
                  <button className="btn ghost small" onClick={() => { updateProject((c) => c, { history: true }); updateProject((c) => ({ ...c, blog: { ...c.blog, posts: c.blog.posts.filter((item) => item.id !== currentPost.id) } })); }}>删除文章</button>
                </div>
              )}
            </>
          )}

          {tab === 'help' && (
            <div className="card help">
              <h2><Icon name="help" />这个定制器是什么？</h2>
              <p>打开 GitHub Pages 链接就能编辑。所有改动保存在<strong>当前浏览器</strong>，不会写入公共仓库，也不会同步到其他设备。</p>
              <p>网站 ZIP 只包含可部署的静态网站。工程备份包含完整项目和媒体，用来换电脑或清浏览器前保存进度。</p>
              <div className="save-row">
                <button className="btn" onClick={() => void studio.doExportWebsite()}><Icon name="package" />检查并导出网站</button>
                <button className="btn ghost" onClick={() => void studio.doExportBackup()}><Icon name="folder" />导出工程备份</button>
              </div>
              {studio.exportIssues.length > 0 && (
                <div className="issue-list">
                  {studio.exportIssues.map((issue, index) => (
                    <div key={`${issue.code}-${index}`}>
                      <button type="button" onClick={() => { if (issue.tab) setTab(issue.tab as StudioTab); if (issue.lang) void switchLang(issue.lang); window.setTimeout(() => flashField(issue.field), 50); }}>{issue.message}</button>
                    </div>
                  ))}
                </div>
              )}
              <p className="muted-note">导入备份前建议先导出当前工程。</p>
              <div className="row">
                <button className="btn ghost" onClick={() => importBackup('new')}>导入为新项目</button>
                <button className="btn ghost" onClick={() => importBackup('overwrite')}>覆盖当前项目</button>
              </div>
              <button className="btn danger" onClick={() => {
                if (window.confirm('重置前建议先导出工程备份。确定恢复默认模板？')) void studio.resetToStarter();
              }}><Icon name="reset" />重置为示例内容</button>
              <div className="switch-row">
                <div className="sw-label"><b>显示页脚署名</b><small>默认关闭。工具品牌不会进入导出网站署名。</small></div>
                <label className="switch"><input type="checkbox" checked={project.siteFlags.attributionEnabled} onChange={(e) => updateProject((c) => ({ ...c, siteFlags: { ...c.siteFlags, attributionEnabled: e.target.checked } }))} /><i /></label>
              </div>
            </div>
          )}
        </div>
        <div className="preview">
          <div className="preview-bar">
            实时预览
            <button className={previewMode === 'desktop' ? 'on' : ''} onClick={() => setPreviewMode('desktop')}><Icon name="monitor" />电脑</button>
            <button className={previewMode === 'mobile' ? 'on' : ''} onClick={() => setPreviewMode('mobile')}><Icon name="phone" />手机</button>
            <button className={interaction === 'preview' ? 'on' : ''} onClick={() => setInteraction('preview')}><Icon name="monitor" />正常预览</button>
            <button className={interaction === 'edit' ? 'on' : ''} onClick={() => setInteraction('edit')}><Icon name="pointer" />点哪改哪</button>
            <span style={{ color: interaction === 'edit' ? '#c13b25' : '#047857', fontWeight: 600 }}>
              {interaction === 'edit' ? '点预览里的内容试试 →' : '正常预览：可以打开弹窗、按钮和链接'}
            </span>
          </div>
          <div className={`preview-frame-wrap ${previewMode === 'mobile' ? 'mobile' : ''}`} id="pv-wrap">
            <iframe id="pv" ref={iframeRef} title="网站预览" src="./preview.html" />
          </div>
        </div>
      </div>
      <div id="toast" className={studio.toast ? `show ${studio.toast.error ? 'err' : ''}` : ''}>
        {studio.toast ? <><Icon name={studio.toast.error ? 'x' : 'check'} />{studio.toast.text}</> : null}
      </div>
    </div>
  );

  function patchHome(partial: Partial<typeof home>) {
    updateProject((current) => ({
      ...current,
      home: { ...current.home, [lang]: { ...current.home[lang], ...partial } },
    }));
  }
  function patchIdentities(list: string[], icons: string[]) {
    patchHome({ sidebar: { ...home.sidebar, skillList: list, skillIcons: icons } });
  }
  function patchTimeline(index: number, partial: Partial<(typeof home.timeline.items)[number]>) {
    patchHome({ timeline: { ...home.timeline, items: home.timeline.items.map((item, i) => i === index ? { ...item, ...partial } : item) } });
  }
  function patchMetrics(index: number, partial: Partial<(typeof home.metrics)[number]>) {
    patchHome({ metrics: home.metrics.map((item, i) => i === index ? { ...item, ...partial } : item) });
  }
  function patchResume(partial: Partial<typeof resume>) {
    updateProject((current) => ({ ...current, resume: { ...current.resume, [lang]: { ...current.resume[lang], ...partial } } }));
  }
  function patchExperience(index: number, partial: Partial<(typeof resume.experiences)[number]>) {
    patchResume({ experiences: resume.experiences.map((item, i) => i === index ? { ...item, ...partial } : item) });
  }
  function patchContact(partial: Partial<typeof contact>) {
    updateProject((current) => ({ ...current, contact: { ...current.contact, [lang]: { ...current.contact[lang], ...partial } } }));
  }
  function patchSkillsTitle(which: 'zh' | 'en', value: string) {
    updateProject((current) => ({
      ...current,
      skills: { ...current.skills, dashboard: { ...current.skills.dashboard, title: { ...current.skills.dashboard.title, [which]: value } } },
    }));
  }
  function patchSkillCategory(index: number, partial: any) {
    updateProject((current) => {
      const categories = current.skills.dashboard.categories.map((item, i) => i === index ? { ...item, ...partial } : item);
      return { ...current, skills: { ...current.skills, dashboard: { ...current.skills.dashboard, categories } } };
    });
  }
  function patchTool(cIndex: number, toolId: string, partial: { name: string }) {
    updateProject((current) => {
      const categories = current.skills.dashboard.categories.map((cat, i) => i !== cIndex ? cat : { ...cat, tools: cat.tools.map((tool) => tool.id === toolId ? { ...tool, ...partial } : tool) });
      return { ...current, skills: { ...current.skills, dashboard: { ...current.skills.dashboard, categories } } };
    });
  }
  function patchAppearance(partial: Partial<ReturnType<typeof readAppearance>>) {
    updateProject((current) => {
      const next = applyAppearance(current.theme, { ...readAppearance(current.theme), ...partial });
      return { ...current, theme: next, editor: { ...current.editor, checklist: { ...current.editor.checklist, themeSaved: true } } };
    });
  }
  function patchProjectLocale(id: string, partial: { title?: string; subtitle?: string; description?: string }) {
    updateProject((current) => ({
      ...current,
      projects: current.projects.map((item) => item.id !== id ? item : {
        ...item,
        title: partial.title ?? item.title,
        locales: {
          zh: { ...(item.locales?.zh || { title: '', subtitle: '', description: '' }), ...(lang === 'zh' ? partial : {}) },
          en: { ...(item.locales?.en || { title: '', subtitle: '', description: '' }), ...(lang === 'en' ? partial : {}) },
        },
      }),
    }));
  }
  function patchProjectMeta(id: string, partial: Record<string, unknown>) {
    updateProject((current) => ({
      ...current,
      projects: current.projects.map((item) => item.id !== id ? item : { ...item, ...partial }),
    }));
  }
  function patchPost(id: string, partial: Record<string, unknown>) {
    updateProject((current) => ({
      ...current,
      blog: { ...current.blog, posts: current.blog.posts.map((item) => item.id !== id ? item : { ...item, ...partial }) },
    }));
  }
  async function pickAndUpload(role: string) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = role.includes('Video') ? 'video/mp4,video/webm' : 'image/png,image/jpeg,image/webp,image/svg+xml';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) await studio.uploadFile(role, file);
    };
    input.click();
  }
  async function uploadProjectAsset(id: string, role: 'coverLight' | 'coverDark') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const mediaId = await studio.uploadFile(role, file);
      if (!mediaId) return;
      updateProject((current) => ({
        ...current,
        projects: current.projects.map((item) => item.id !== id ? item : {
          ...item,
          cover: role === 'coverLight' ? mediaId : item.cover,
          assets: { ...item.assets, [role]: mediaId },
        }),
      }));
    };
    input.click();
  }
  async function uploadBlogCover(id: string) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const mediaId = await studio.uploadFile('blogCover', file);
      if (!mediaId) return;
      patchPost(id, { cover: mediaId });
    };
    input.click();
  }
  function createProject() {
    const id = window.prompt('项目 id（小写字母、数字和连字符）', `project-${Date.now().toString(36)}`);
    if (!id) return;
    try {
      assertAvailableProjectId(id, project.projects.map((item) => item.id));
    } catch (error) {
      studio.showToast(error instanceof Error ? error.message : '项目 id 不合法', true);
      return;
    }
    updateProject((current) => ({
      ...current,
      projects: [...current.projects, {
        id,
        title: id,
        subtitle: '',
        description: '',
        year: String(new Date().getFullYear()),
        role: '',
        outcome: '',
        icon: 'style',
        themeColor: '#94A3B8',
        published: true,
        isPrimary: true,
        order: current.projects.length + 1,
        locales: {
          zh: { title: id, subtitle: '', description: '', keywords: [], detailImages: [] },
          en: { title: id, subtitle: '', description: '', keywords: [], detailImages: [] },
        },
      }],
    }), { history: true });
    setProjectId(id);
  }
  function createPost() {
    const date = localDateStamp();
    let createdId = '';
    updateProject((current) => {
      createdId = nextBlogPostId(current.blog.posts.map((item) => item.id), date);
      return {
        ...current,
        blog: {
          ...current.blog,
          posts: [{ id: createdId, date, title: '新文章', summary: '', categoryId: current.blog.categories[0]?.id }, ...current.blog.posts],
        },
      };
    }, { history: true });
    if (createdId) setBlogId(createdId);
  }
  async function importBackup(mode: 'new' | 'overwrite') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,application/zip';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (mode === 'overwrite' && !window.confirm('覆盖当前项目前建议先导出工程备份。确定覆盖？')) return;
      try {
        await studio.doImportBackup(file, mode);
      } catch (error) {
        studio.showToast(error instanceof Error ? error.message : '导入失败', true);
      }
    };
    input.click();
  }
};
