export const CANOPY_BRAND={
  name:'WOMATE Canopy',
  short:'Canopy',
  strap:'Learn climate. Grow leadership.',
  programme:'She Leads Climate Mentorship',
  cohort:'Cohort 3 · 2027',
  duration:'8 weeks',
  level:'Foundational',
  cost:'Free'
};

const video=(key)=>import.meta.env[key]||'';

export const modules=[
  {
    id:'climate-foundations',number:'01',week:'Weeks 1â€“2',title:'Understanding Climate Change',
    question:'What is happening to our climate, why is it happening, and why does it matter?',
    summary:'Build a clear, practical foundation in climate science, impacts, mitigation and adaptation, with African realities at the centre.',
    youtubeId:video('VITE_CANOPY_VIDEO_MODULE_1'),
    lessons:[
      {id:'climate-vs-weather',title:'Climate is not weather',minutes:8,body:[
        'Weather describes short-term conditions such as todayâ€™s rainfall or temperature. Climate describes patterns observed over much longer periods.',
        'Climate change means those long-term patterns are shifting. The shift is already changing heat, rainfall, drought, flooding, coastlines, ecosystems and livelihoods in different ways across the world.',
        'You do not need to be a climate scientist to participate in climate action. You do need a reliable foundation for understanding what is changing and why.'
      ],takeaway:'Climate is a long-term pattern. Climate change is a sustained shift in that patternâ€”not a single hot day, flood or storm.'},
      {id:'why-climate-changes',title:'Why the climate is changing',minutes:10,body:[
        'The greenhouse effect is a natural process that keeps Earth warm enough for life. Human activity has intensified it by increasing heat-trapping gases in the atmosphere.',
        'Burning coal, oil and gas is the largest driver. Land-use change, agriculture, industry and waste also contribute.',
        'Carbon dioxide is not the only greenhouse gas. Methane and nitrous oxide also matter, and different activities produce different combinations of emissions.'
      ],takeaway:'Todayâ€™s rapid warming is primarily driven by human-caused greenhouse-gas emissions.'},
      {id:'african-realities',title:'Climate change in African realities',minutes:12,body:[
        'Climate impacts are experienced through daily systems: food, water, health, energy, housing, transport, livelihoods and safety.',
        'The same climate hazard can produce different outcomes depending on poverty, infrastructure, access to information, gender, disability, location and political power.',
        'Effective climate action therefore requires both environmental understanding and attention to the social conditions that shape vulnerability and resilience.'
      ],takeaway:'A climate hazard becomes a human crisis when exposure and vulnerability are high and the capacity to respond is low.'},
      {id:'mitigation-adaptation',title:'Mitigation, adaptation and resilience',minutes:10,body:[
        'Mitigation tackles the causes of climate change by reducing emissions or increasing the removal of greenhouse gases from the atmosphere.',
        'Adaptation responds to impacts that are already happening or expectedâ€”for example drought-resilient farming, flood preparedness or heat-health planning.',
        'Resilience is the capacity of people, communities and systems to anticipate, absorb, recover from and adapt to shocks while continuing to function.'
      ],takeaway:'Mitigation reduces future warming; adaptation reduces harm; resilience strengthens the ability to cope and recover.'}
    ],
    quiz:[
      {q:'Which statement best describes climate?',options:['Todayâ€™s temperature','Long-term patterns of weather','A single flood event','Only rainfall'],answer:1},
      {q:'What is mitigation mainly concerned with?',options:['Reducing the causes of climate change','Responding after every disaster','Measuring attendance','Replacing all adaptation'],answer:0},
      {q:'Why can the same climate hazard affect two communities differently?',options:['Climate only affects cities','Exposure and vulnerability differ','Weather forecasts are always wrong','Only income matters'],answer:1}
    ],
    assignment:{title:'Assignment 01 · Climate in my context',prompt:'Choose one climate-related change or risk visible in your community or country. In 250â€“400 words, explain what is changing, who is affected, and one adaptation or mitigation response that could help.'}
  },
  {
    id:'gender-justice',number:'02',week:'Week 3',title:'Gender & Climate Justice',
    question:'Who experiences climate change differently, and what does a just response require?',
    summary:'Understand how gender, inequality and access to resources shape climate impactsâ€”and what inclusive climate solutions look like.',
    youtubeId:video('VITE_CANOPY_VIDEO_MODULE_2'),
    lessons:[
      {id:'unequal-impacts',title:'Climate impacts are not gender-neutral',minutes:9,body:[
        'Climate change affects everyone, but not everyone begins with the same resources, rights, responsibilities or decision-making power.',
        'In many contexts women carry greater responsibility for water, food, care and household wellbeing while having less control over land, finance, technology and formal decision-making.',
        'These patterns can increase climate risk, but women are not simply victims. Women are also farmers, researchers, entrepreneurs, organisers, policymakers and holders of local knowledge.'
      ],takeaway:'Gender analysis asks who is affected, how, why, and who has the power and resources to respond.'},
      {id:'justice',title:'What climate justice means',minutes:10,body:[
        'Climate justice connects environmental change with fairness. It asks who contributed most to the problem, who experiences the greatest harm, who has resources to adapt and who participates in decisions.',
        'A just response does not only distribute benefits. It also improves participation, recognition, rights and access to resources.',
        'Good climate programmes therefore avoid treating women as one identical group. Age, disability, income, geography, ethnicity and other factors can shape very different experiences.'
      ],takeaway:'Justice is about outcomes and about who gets to shape the decisions that produce those outcomes.'},
      {id:'inclusive-solutions',title:'Designing inclusive solutions',minutes:10,body:[
        'An inclusive climate solution starts by listening to the people most affected and understanding the barriers they face.',
        'Participation should be meaningful: people need information, time, accessibility, safety and a genuine ability to influence the final decision.',
        'Gender-responsive action can improve programme quality because it reveals needs, knowledge and constraints that may otherwise remain invisible.'
      ],takeaway:'Inclusion is not adding women at the end. It is designing with diverse women from the beginning.'}
    ],
    quiz:[
      {q:'A gender-responsive climate approach should begin by:',options:['Assuming all women have the same needs','Understanding different roles, risks and access to resources','Removing men from climate programmes','Focusing only on statistics'],answer:1},
      {q:'Climate justice is concerned with:',options:['Only emissions data','Fairness, participation and unequal impacts','Only conservation','Only international negotiations'],answer:1},
      {q:'Meaningful participation means:',options:['People are informed after decisions','People can genuinely influence decisions','Only experts speak','Attendance is enough'],answer:1}
    ],
    assignment:{title:'Assignment 02 · Who is missing?',prompt:'Choose a climate issue in your community. Identify two groups of women who may experience it differently and explain what an inclusive response should consider.'}
  },
  {
    id:'governance-policy',number:'03',week:'Week 4',title:'Climate Governance & Policy',
    question:'Who makes climate decisions, and how can young women participate meaningfully?',
    summary:'Meet the institutions, agreements and policy spaces that shape climate action, from local government to the UNFCCC and national NDCs.',
    youtubeId:video('VITE_CANOPY_VIDEO_MODULE_3'),
    lessons:[
      {id:'decision-system',title:'Who makes climate decisions?',minutes:10,body:[
        'Climate governance is the system of institutions, rules, policies, relationships and decision-making processes used to respond to climate change.',
        'Decisions can be made at community, municipal, national, regional and international levels. Governments are central, but civil society, businesses, researchers, funders, communities and citizens also shape outcomes.',
        'Understanding the system helps you identify where your voice, evidence or work can influence a real decision.'
      ],takeaway:'Climate governance is a network of decision spacesâ€”not one institution or conference.'},
      {id:'unfccc-cop',title:'UNFCCC and COP without the jargon',minutes:12,body:[
        'The United Nations Framework Convention on Climate Change, or UNFCCC, is the main international framework through which countries cooperate on climate change.',
        'The Conference of the Parties, known as COP, is the formal meeting where parties negotiate, review progress and make decisions under that framework.',
        'COP matters, but climate action does not begin or end there. National policies, budgets, local plans and implementation determine what people experience on the ground.'
      ],takeaway:'COP is one important decision space inside a much larger climate-governance system.'},
      {id:'ndcs',title:'What is an NDC?',minutes:9,body:[
        'A Nationally Determined Contribution, or NDC, sets out a countryâ€™s climate commitments under the Paris Agreement.',
        'NDCs typically describe mitigation priorities and may also include adaptation, finance, capacity-building and other national needs.',
        'Knowing your countryâ€™s NDC can help you connect a community project, advocacy campaign or professional role to national climate priorities.'
      ],takeaway:'An NDC is a practical entry point for understanding what your country says it will do on climate change.'},
      {id:'participation',title:'Finding your entry point',minutes:10,body:[
        'Participation can include public consultations, local planning, youth or womenâ€™s networks, civil-society coalitions, research, journalism, professional associations and direct engagement with institutions.',
        'Credibility grows when advocacy is specific: identify the decision, the decision-maker, the evidence, the people affected and the change you are asking for.',
        'You do not need a formal title to begin participating, but you do need to understand the process you want to influence.'
      ],takeaway:'Effective participation connects a clear issue to a real decision-maker and a realistic route for influence.'}
    ],
    quiz:[
      {q:'What is an NDC?',options:['A private company plan','A countryâ€™s climate commitments under the Paris Agreement','A COP attendance badge','A climate degree'],answer:1},
      {q:'Climate governance happens:',options:['Only at COP','Only in national ministries','Across local, national and international decision spaces','Only online'],answer:2},
      {q:'A stronger advocacy ask identifies:',options:['A vague problem only','A decision, decision-maker, evidence and requested change','Only a hashtag','Only a speaker'],answer:1}
    ],
    assignment:{title:'Assignment 03 · Map a decision',prompt:'Identify one climate decision that matters to you. Name the institution or decision-maker, who is affected, one piece of evidence that matters, and one realistic way young women could participate.'}
  },
  {
    id:'advocacy-digital',number:'04',week:'Weeks 5â€“6',title:'Climate Advocacy & Digital Innovation',
    question:'How can storytelling and technology make climate issues credible and capable of mobilising action?',
    summary:'Learn to communicate climate issues with evidence, build responsible digital advocacy, recognise misinformation and use AI with judgement.',
    youtubeId:video('VITE_CANOPY_VIDEO_MODULE_4'),
    lessons:[
      {id:'credible-story',title:'From information to a credible story',minutes:10,body:[
        'Climate communication is most useful when it connects evidence with human meaning. A strong story makes the issue understandable without distorting the facts.',
        'Start with the audience: what do they already know, what decision or action is possible, and what evidence will help them trust the message?',
        'Avoid exaggeration. Credibility is an advocacy asset.'
      ],takeaway:'Good climate storytelling is accurate, relevant and designed for a specific audience and action.'},
      {id:'digital-advocacy',title:'Digital advocacy that moves beyond posting',minutes:10,body:[
        'Digital advocacy uses online tools to support a defined change objective. Visibility can help, but reach alone is not impact.',
        'A campaign should know whom it needs to reach, what it wants them to understand or do, and how online activity connects to an offline decision or community outcome.',
        'Track indicators that matter: sign-ups, meeting requests, policy responses, participation, commitments or behaviourâ€”not only likes.'
      ],takeaway:'A digital campaign is stronger when online activity is connected to a real-world objective.'},
      {id:'misinformation',title:'Evidence and misinformation',minutes:10,body:[
        'Climate misinformation can distort scientific findings, remove context or present opinion as evidence.',
        'Before sharing a claim, check the original source, date, methodology and whether reputable institutions or multiple independent sources support it.',
        'When a claim is uncertain, say so. Responsible communication includes knowing what you do not know.'
      ],takeaway:'Verification is part of climate leadership.'},
      {id:'ai',title:'Using AI responsibly in climate work',minutes:11,body:[
        'AI can help organise information, brainstorm, translate, summarise or analyse patterns, but its output can be incomplete, biased or wrong.',
        'Do not treat generated text as evidence. Verify claims against trusted primary or authoritative sources, protect sensitive data and disclose AI assistance when appropriate.',
        'Use technology to extend human judgementâ€”not replace accountability.'
      ],takeaway:'AI can support climate work, but responsibility for accuracy, ethics and decisions remains human.'}
    ],
    quiz:[
      {q:'What makes climate communication credible?',options:['Exaggerating urgency','Connecting accurate evidence to a clear audience and purpose','Using the most hashtags','Avoiding sources'],answer:1},
      {q:'A useful digital advocacy metric is:',options:['Only impressions','A response linked to the campaign objective','Font size','Number of emojis'],answer:1},
      {q:'AI-generated climate information should be:',options:['Published immediately','Treated as verified evidence','Checked against reliable sources','Used without disclosure in every context'],answer:2}
    ],
    assignment:{title:'Assignment 04 · Make climate understandable',prompt:'Create a short climate message for a specific audience (150â€“250 words or a one-minute script). State the audience, the evidence behind your message and the action you want them to take.'}
  },
  {
    id:'leadership-pathways',number:'05',week:'Weeks 7â€“8',title:'Leadership & Professional Pathways',
    question:'How can I lead climate action where I am, and where can that leadership take me professionally?',
    summary:'Turn learning into direction through practical leadership, stakeholder engagement, career mapping and a personal 90-day Climate Action Note.',
    youtubeId:video('VITE_CANOPY_VIDEO_MODULE_5'),
    lessons:[
      {id:'lead-where-you-are',title:'Leadership starts before the title',minutes:9,body:[
        'Climate leadership is the practice of helping people move toward a useful outcome. It can happen in a community group, workplace, university, business, research project or public institution.',
        'Strong leadership combines initiative with listening, reliability and the ability to work with people who hold different interests and forms of expertise.',
        'Your first leadership opportunity is often the problem already close enough for you to understand.'
      ],takeaway:'Leadership is demonstrated through responsibility and action, not only position.'},
      {id:'stakeholders',title:'Working with stakeholders',minutes:10,body:[
        'A stakeholder is any person or institution that affects, is affected by, or has an interest in an issue or decision.',
        'Map stakeholders by influence, interest, role and relationship to the issue. Then decide who needs information, consultation, partnership or direct engagement.',
        'Collaboration becomes easier when you understand what each stakeholder values and what they can contribute.'
      ],takeaway:'Stakeholder mapping turns a broad network into a practical engagement plan.'},
      {id:'careers',title:'Climate is a career ecosystem',minutes:10,body:[
        'Climate careers exist across policy, law, finance, engineering, agriculture, data, research, communications, health, energy, conservation, entrepreneurship and community development.',
        'Begin with the intersection of three things: the climate problem you care about, the skills you already have or want to build, and the institutions where those skills are useful.',
        'A credible career pathway is built through learning, evidence of work, relationships and repeated contribution.'
      ],takeaway:'You do not need one job called â€œclimate leader.â€ You need a useful skill applied to climate-relevant problems.'},
      {id:'action-note',title:'Your 90-day Climate Action Note',minutes:12,body:[
        'Your final task is to turn the programme into one realistic next step. Choose one climate issue, identify who is affected, define one action you can take within 90 days and name the people you need to work with.',
        'Keep the action specific enough to begin. It could be a community conversation, a research brief, a digital campaign, a school activity, an application, a stakeholder meeting or a small pilot.',
        'The goal is not to solve climate change in 90 days. The goal is to leave the programme already moving.'
      ],takeaway:'A small, specific action completed is more valuable than an ambitious idea that never begins.'}
    ],
    quiz:[
      {q:'Climate leadership requires:',options:['A senior title first','Responsibility, listening and useful action','Working alone','Only technical expertise'],answer:1},
      {q:'A stakeholder map helps you:',options:['Identify who matters and how to engage them','Replace all research','Avoid collaboration','Guarantee funding'],answer:0},
      {q:'A strong 90-day action should be:',options:['Impossible to measure','Specific and realistic enough to begin','Dependent on a global summit','Only a personal intention'],answer:1}
    ],
    assignment:{title:'Final Assignment · 90-day Climate Action Note',prompt:'In one page, explain: the climate issue you care about and why it matters; who is affected; one action you will take in the next 90 days; and who you need to work with.'}
  }
];

export const resources=[
  {title:'UNFCCC â€” Climate Action',type:'External reference',url:'https://unfccc.int/'},
  {title:'WOMATE â€” She Leads',type:'Programme page',url:'https://www.womate.org/she-leads'},
  {title:'WOMATE â€” Circle',type:'Community',url:'https://www.womate.org/circle'}
];

