// WOMATE CANOPY
// She Leads Climate Mentorship · Cohort 2 · 2026
// Institutional learning content built from WOMATE's prior speaker materials
// and strengthened with authoritative climate sources.

export const canopySources = {
  ipccGlossary: {
    label: 'IPCC AR6 WGII · Glossary',
    url: 'https://www.ipcc.ch/report/ar6/wg2/chapter/annex-ii/'
  },
  ipccConcepts: {
    label: 'IPCC AR6 WGII · Key concepts',
    url: 'https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-1/'
  },
  ipccAfrica: {
    label: 'IPCC AR6 WGII · Africa',
    url: 'https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-9/'
  },
  unfcccNdc: {
    label: 'UNFCCC · Nationally Determined Contributions',
    url: 'https://unfccc.int/process-and-meetings/the-paris-agreement/nationally-determined-contributions-ndcs'
  },
  undrrResilience: {
    label: 'UNDRR · Resilience terminology',
    url: 'https://www.undrr.org/terminology/resilience'
  },
  unWomen: {
    label: 'UN Women · Climate change',
    url: 'https://www.unwomen.org/en/what-we-do/economic-empowerment/climate-change'
  },
  sdg13: {
    label: 'United Nations · SDG 13 Climate Action',
    url: 'https://sdgs.un.org/goals/goal13'
  }
};

export const canopyModules2026 = [
  {
    id:'01',
    slug:'understanding-climate-change',
    weekLabel:'Week 1 & 2',
    liveDate:'24 September 2026',
    title:'Understanding Climate Change',
    framingQuestion:'What is happening to our climate, why is it happening, and why does it matter?',
    overview:'Build a clear foundation in climate science, climate risk and the difference between mitigation, adaptation and resilience — then connect those ideas to what participants can observe in their own communities.',
    outcomes:[
      'Distinguish weather, climate and climate change.',
      'Explain the human drivers of current climate change without jargon.',
      'Use hazard, exposure and vulnerability to reason about climate risk.',
      'Distinguish mitigation from adaptation and resilience.',
      'Connect climate concepts to lived realities in Ghana and across Africa.'
    ],
    lessons:[
      {
        id:'01.1',title:'Weather, climate and a changing system',minutes:12,
        body:[
          'Weather describes short-term atmospheric conditions. Climate describes patterns and variability over much longer periods. Climate change is a persistent change in the state of the climate, identified through changes in average conditions and/or variability over decades or longer.',
          'Natural processes can influence climate, but the present era of rapid warming is strongly shaped by human activities that increase greenhouse gases, particularly fossil-fuel use and land-use change.',
          'A useful learning habit is to avoid treating one hot day, one flood or one dry season as proof by itself. Climate understanding comes from patterns, trends, attribution and evidence.'
        ],
        keyIdea:'Climate is a long-term pattern. Climate change changes the conditions in which individual weather events occur.',
        check:{question:'Which statement best separates weather from climate?',options:['Weather is global; climate is local.','Weather is short-term conditions; climate describes longer-term patterns and variability.','Weather is natural; climate is caused by humans.'],answer:1,explanation:'Weather is short-term. Climate is the longer-term statistical pattern and variability.'},
        sources:['ipccGlossary','ipccConcepts']
      },
      {
        id:'01.2',title:'Drivers, greenhouse gases and impacts',minutes:14,
        body:[
          'Greenhouse gases retain heat in the climate system. Human activities add carbon dioxide, methane, nitrous oxide and other greenhouse gases to the atmosphere. Major sources include fossil-fuel combustion, deforestation, agriculture, industrial processes and waste.',
          'Impacts are not limited to temperature. Climate change can affect rainfall patterns, drought, floods, heat extremes, sea level, ecosystems, food and water security, livelihoods, infrastructure, health and wellbeing.',
          'Africa faces significant climate risks even though its historical contribution to global greenhouse-gas emissions has been comparatively small. This makes questions of responsibility, capacity and justice central to African climate leadership.'
        ],
        keyIdea:'Climate change is a risk multiplier: it interacts with existing social, economic and environmental pressures.',
        check:{question:'Which is a mitigation action?',options:['Raising a home above expected flood levels.','Installing early-warning systems.','Replacing fossil-fuel electricity with renewable generation.'],answer:2,explanation:'Mitigation reduces emissions or increases greenhouse-gas sinks.'},
        sources:['ipccGlossary','ipccAfrica']
      },
      {
        id:'01.3',title:'Risk: hazard, exposure and vulnerability',minutes:15,
        body:[
          'A climate hazard is a potentially damaging climate-related event or trend. Exposure describes people, livelihoods, ecosystems, infrastructure or assets located where they could be affected. Vulnerability describes a propensity or predisposition to be adversely affected, including sensitivity and limited capacity to cope or adapt.',
          'Two communities can face the same heavy rainfall but experience very different consequences. Drainage, housing quality, income, access to information, health, mobility, social networks and public services can change the level of risk.',
          'This is why good climate action asks more than “What hazard is coming?” It also asks “Who or what is exposed?”, “Why are they vulnerable?” and “What capacity already exists?”'
        ],
        keyIdea:'Risk is shaped by climate hazards and by the social conditions that determine exposure and vulnerability.',
        check:{question:'A flood affects two neighbourhoods differently mainly because one has safe drainage, stronger housing and better warning access. What concept does this illustrate?',options:['Only hazard','Differences in exposure and vulnerability','Only mitigation'],answer:1,explanation:'The hazard may be similar while exposure, vulnerability and coping capacity differ.'},
        sources:['ipccConcepts','ipccGlossary']
      },
      {
        id:'01.4',title:'Mitigation, adaptation and resilience',minutes:15,
        body:[
          'Mitigation addresses the causes of climate change by reducing greenhouse-gas emissions or increasing removals. Adaptation is adjustment to actual or expected climate effects in order to reduce harm or take advantage of beneficial opportunities.',
          'Adaptation can be anticipatory or reactive, incremental or transformational. Community-based adaptation places local context, knowledge, agency and preferences at the centre of adaptation decisions.',
          'Resilience is the capacity of systems and communities to resist, absorb, adapt to, transform and recover from hazards while maintaining or restoring essential functions. Resilience is not simply “being strong”; it depends on resources, institutions, learning, inclusion and risk management.'
        ],
        keyIdea:'Mitigation tackles causes; adaptation manages impacts; resilience describes capacity to cope, learn, adapt and recover.',
        check:{question:'Rainwater harvesting in a drought-prone community is primarily an example of:',options:['Adaptation','Greenhouse-gas accounting','Climate attribution'],answer:0,explanation:'It helps people adjust to water-related climate impacts.'},
        sources:['ipccGlossary','undrrResilience']
      }
    ],
    caseStudy:{
      title:'Climate Change Detective · From observation to evidence',
      text:'WOMATE’s earlier She Leads exercise asked participants to observe a visible climate-related issue in their surroundings, document it, reflect on its effects — especially for women or young people — and propose a practical response. In Canopy, the exercise is strengthened by requiring participants to separate observation from assumption and analyse hazard, exposure and vulnerability.'
    },
    assignment:{
      paragraphPrompt:'Identify one climate-related issue you can observe in your community. Describe the evidence you can directly observe, then explain the likely hazard, who or what is exposed, what creates vulnerability, and one realistic adaptation or mitigation response. Separate what you know from what you infer.',
      canvasBrief:'Create a CanopyCanvas awareness graphic for a clearly defined local audience. The graphic should communicate the issue responsibly and ask for one realistic action.',
      puzzle:['CLIMATE','HAZARD','EXPOSURE','ADAPTATION'],
      rubric:{climateUnderstanding:25,application:25,evidenceReasoning:20,actionQuality:15,communication:15}
    },
    sources:['ipccGlossary','ipccConcepts','ipccAfrica','undrrResilience']
  },

  {
    id:'02',
    slug:'gender-climate-justice',
    weekLabel:'Week 3',
    liveDate:'1 October 2026',
    title:'Gender & Climate Justice',
    framingQuestion:'Who experiences climate change differently, and what does a just response require?',
    overview:'Move beyond the statement that women are “more vulnerable” and examine how power, resources, roles, care responsibilities, livelihoods, mobility and participation shape climate impacts and adaptive capacity.',
    outcomes:[
      'Explain why climate impacts are not gender-neutral.',
      'Distinguish gender from biological sex in climate analysis.',
      'Recognise differences among women rather than treating women as one homogeneous group.',
      'Analyse agency alongside vulnerability.',
      'Apply equity, participation and accountability to climate responses.'
    ],
    lessons:[
      {
        id:'02.1',title:'Climate change is not gender-neutral',minutes:14,
        body:[
          'Gender shapes roles, expectations, access to resources, decision-making power and responsibilities. These social arrangements can influence who is exposed to climate hazards, who has information and finance, who can move, and who carries additional care or livelihood burdens after a shock.',
          'Women are not a homogeneous group. Age, income, disability, location, livelihood, education, marital status and other factors can change both vulnerability and capacity. Gender analysis therefore asks which women, in which context, with what resources and constraints.',
          'The aim is not to describe women only as victims. Women are farmers, researchers, entrepreneurs, organisers, policymakers, innovators and knowledge holders. Climate justice requires attention to both unequal constraints and existing agency.'
        ],
        keyIdea:'Gender analysis examines power, roles, resources and decision-making — not a simplistic claim that all women experience climate change in the same way.',
        check:{question:'Which is the strongest gender-responsive climate question?',options:['Are women vulnerable?','How do roles, resources and decision-making power shape different people’s exposure, vulnerability and capacity?','Do women care more about climate change?'],answer:1,explanation:'Gender-responsive analysis investigates structures, differences and agency.'},
        sources:['unWomen','ipccConcepts']
      },
      {
        id:'02.2',title:'Resources, livelihoods and adaptation',minutes:15,
        body:[
          'Adaptation capacity depends partly on access to land, finance, technology, information, public services and social networks. When these are distributed unequally, people facing similar climate hazards may have very different options.',
          'WOMATE’s prior Ghana-focused teaching used irrigation to illustrate this problem: adaptation technologies can exist while land rights, finance and institutional access still constrain adoption. Participants should therefore assess both the technical solution and who can actually use it.',
          'Informal trading, collective farming, savings groups, indigenous observation and social networks can demonstrate adaptive agency. Strong climate programmes recognise these capacities while avoiding the assumption that communities should simply cope with structural exclusion.'
        ],
        keyIdea:'An adaptation option is not equitable merely because it exists. Access determines who can benefit.',
        check:{question:'A government subsidises irrigation equipment, but women farmers cannot access land titles or credit required by the programme. What is missing?',options:['A climate hazard','Equitable access and enabling conditions','A greenhouse gas'],answer:1,explanation:'Technical adaptation can fail when structural barriers prevent access.'},
        sources:['ipccGlossary','unWomen']
      },
      {
        id:'02.3',title:'Mobility, care and invisible adaptation work',minutes:14,
        body:[
          'Migration can be one response to climate and livelihood pressures, but the ability to move is unequal. Some people migrate in search of work or safety; others remain because of finances, care responsibilities, culture, health or other constraints.',
          'People who stay behind may sustain farms, households, children, food systems and community networks through work that receives little recognition. Climate analysis should therefore avoid equating mobility with agency or immobility with passivity.',
          'A just response considers safety and opportunity for migrants while also recognising and supporting those whose adaptation work takes place at home and in communities.'
        ],
        keyIdea:'Climate mobility and immobility both have gender dimensions. Remaining in place can involve substantial adaptation labour.',
        check:{question:'Which statement is most accurate?',options:['Migration always means successful adaptation.','People who stay behind are not adapting.','Mobility options and constraints can be gendered, and both migrants and those remaining may exercise agency.'],answer:2,explanation:'Mobility outcomes depend on context, resources, constraints and agency.'},
        sources:['ipccGlossary','unWomen']
      },
      {
        id:'02.4',title:'From vulnerability to climate justice',minutes:15,
        body:[
          'Climate justice asks how climate harms and climate responses are distributed, who participates in decisions and whose knowledge counts. Equity does not necessarily mean giving everyone the same support; it means recognising different needs, responsibilities and barriers.',
          'A gender-responsive response can improve access to land, finance, information and technology; fund women-led organisations; recognise care responsibilities; make participation meaningful; and track whether climate finance and programmes actually reach intended groups.',
          'Accountability matters. Representation in a meeting is not the same as influence over decisions. Participants should learn to ask who set the agenda, who spoke, whose evidence was used, what resources followed and how results will be measured.'
        ],
        keyIdea:'Justice concerns distribution, recognition, participation and accountability — not simply representation.',
        check:{question:'Which is the strongest sign of meaningful participation?',options:['Women appear in event photographs.','Women are invited but cannot influence the agenda.','Women have information, voice, decision-making influence and a way to hold institutions accountable.'],answer:2,explanation:'Meaningful participation requires influence and accountability, not symbolic presence.'},
        sources:['unWomen','ipccConcepts']
      }
    ],
    caseStudy:{
      title:'Ghana lens · Irrigation, migration and women’s agency',
      text:'WOMATE’s previous gender-and-climate session examined women’s climate perceptions, barriers to irrigation, migration as adaptation, gendered immobility and advocacy. Canopy retains these themes as a Ghana-focused case while reframing participants as agents whose choices are shaped by unequal structures.'
    },
    assignment:{
      paragraphPrompt:'Choose one climate response in Ghana or your own community. Analyse who is expected to benefit, what gender-related barrier could prevent equal benefit, what existing agency or local knowledge should be recognised, and one design change that would make the response more just.',
      canvasBrief:'Create a CanopyCanvas campaign that communicates a gender-and-climate issue without portraying women only as helpless victims. Show agency and identify one concrete institutional or community action.',
      puzzle:['JUSTICE','EQUITY','AGENCY','ACCESS'],
      rubric:{genderAnalysis:25,justiceReasoning:25,application:20,agencyFraming:15,communication:15}
    },
    sources:['unWomen','ipccConcepts','ipccGlossary']
  },

  {
    id:'03',
    slug:'climate-governance-policy',
    weekLabel:'Week 4',
    liveDate:'8 October 2026',
    title:'Climate Governance & Policy',
    framingQuestion:'Who makes climate decisions, and how can young women participate meaningfully?',
    overview:'Demystify the institutions, agreements and policy processes that turn climate evidence into collective decisions — from the Paris Agreement and NDCs to national and local implementation.',
    outcomes:[
      'Explain the difference between climate governance and climate policy.',
      'Describe the basic role of the UNFCCC, Paris Agreement and NDCs.',
      'Map actors from global to local climate governance.',
      'Identify meaningful entry points for participation.',
      'Translate evidence and community experience into a policy ask.'
    ],
    lessons:[
      {
        id:'03.1',title:'Governance: more than government',minutes:14,
        body:[
          'Climate governance is the system of institutions, rules, relationships and decision-making processes through which societies respond to climate change. Governments are central, but businesses, civil society, researchers, communities, traditional authorities, media, funders and international organisations also shape outcomes.',
          'Climate policy is one instrument within governance. Policies can use regulation, incentives, public investment, information, planning and participatory processes to accelerate mitigation and adaptation.',
          'Good governance asks who has authority, who has information, who controls resources, who is represented and who is accountable for implementation.'
        ],
        keyIdea:'Government is an actor; governance is the wider system through which climate decisions are made and implemented.',
        check:{question:'Which best describes climate governance?',options:['Only laws passed by parliament.','The wider institutions, rules, actors and processes shaping climate decisions.','Only international climate conferences.'],answer:1,explanation:'Governance includes formal and informal actors and decision processes at multiple levels.'},
        sources:['ipccGlossary']
      },
      {
        id:'03.2',title:'UNFCCC, Paris Agreement and NDCs',minutes:16,
        body:[
          'The UN Framework Convention on Climate Change provides the international framework for climate cooperation. The Paris Agreement establishes a global framework for countries to strengthen climate action over time.',
          'Nationally Determined Contributions — NDCs — are at the heart of the Paris Agreement. Each Party prepares and communicates successive NDCs describing efforts it intends to pursue. NDCs include efforts to reduce national emissions and can also communicate adaptation priorities.',
          'The important leadership question is not simply “What does the agreement say?” It is “How do international commitments translate into national plans, budgets, sector decisions and implementation that people can see?”'
        ],
        keyIdea:'NDCs connect global climate commitments with nationally determined action.',
        check:{question:'What is an NDC?',options:['A global tax set by the UN.','A nationally determined contribution communicating a country’s climate efforts under the Paris Agreement.','A private-sector sustainability certificate.'],answer:1,explanation:'NDCs are national climate commitments central to the Paris Agreement.'},
        sources:['unfcccNdc']
      },
      {
        id:'03.3',title:'From policy text to implementation',minutes:15,
        body:[
          'A policy can be ambitious on paper and weak in implementation. Delivery depends on budgets, institutional mandates, data, capacity, coordination, timelines, enforcement and public accountability.',
          'Participants should learn to read a climate policy with practical questions: What problem is defined? Who is responsible? What action is promised? What resources are committed? Who benefits? How will progress be measured? What happens if implementation stalls?',
          'Gender-responsive policy analysis adds another layer: whose needs and knowledge informed the policy, whether sex-disaggregated or other relevant data are used, and whether women can influence implementation and resource allocation.'
        ],
        keyIdea:'A policy promise becomes meaningful only when responsibility, resources, implementation and accountability are clear.',
        check:{question:'Which is the strongest implementation question?',options:['Is the policy document visually attractive?','Who is responsible, what resources exist and how will progress be measured?','How many pages does the policy have?'],answer:1,explanation:'Implementation requires responsibility, resources and measurable follow-through.'},
        sources:['ipccGlossary','unWomen']
      },
      {
        id:'03.4',title:'Finding your entry point',minutes:14,
        body:[
          'Young women do not need to wait for a formal title before participating in climate governance. Entry points can include public consultations, local assemblies, youth or women’s organisations, research, professional associations, community groups, journalism, entrepreneurship and evidence-based digital advocacy.',
          'Effective participation starts with a specific ask. “Do more about climate change” is difficult to act on. A stronger ask identifies the decision-maker, requested action, evidence, affected group and desired result.',
          'Coalitions can increase legitimacy and reach. WOMATE’s earlier advocacy teaching emphasised evidence, community stories, partnerships, engagement with decision-makers, amplification of women’s voices and accountability.'
        ],
        keyIdea:'Influence becomes more practical when an issue is translated into a specific, evidence-backed ask for a real decision-maker.',
        check:{question:'Which is the strongest policy ask?',options:['Government should fix climate change.','The municipal assembly should publish and fund a drainage maintenance schedule before the next major rainy season, prioritising repeatedly flooded communities.','People should care more.'],answer:1,explanation:'It identifies an actor, action, timing and affected context.'},
        sources:['unfcccNdc','sdg13']
      }
    ],
    caseStudy:{
      title:'From community evidence to a policy ask',
      text:'Participants trace one local climate concern upward: community experience → local authority or sector institution → national policy or NDC priority → a specific participation or accountability entry point.'
    },
    assignment:{
      paragraphPrompt:'Choose one climate issue and identify a real decision-maker or institution with authority over part of the response. Write a concise policy analysis: the problem, affected group, current gap, evidence you would use, and one specific action you want that decision-maker to take.',
      canvasBrief:'Create a CanopyCanvas public-interest graphic that translates your policy ask for a defined audience without oversimplifying the evidence.',
      puzzle:['POLICY','NDC','GOVERNANCE','ACCOUNTABILITY'],
      rubric:{governanceUnderstanding:25,actorMapping:20,evidenceUse:20,policyAsk:20,communication:15}
    },
    sources:['unfcccNdc','ipccGlossary','sdg13']
  },

  {
    id:'04',
    slug:'climate-advocacy-digital-innovation',
    weekLabel:'Week 5 & 6',
    liveDate:'15 October 2026',
    title:'Climate Advocacy & Digital Innovation',
    framingQuestion:'How can storytelling and technology make climate issues credible and capable of mobilising action?',
    overview:'Teach participants to move from awareness content to responsible advocacy: evidence, audience, message, action, channel, ethics and measurement — with CanopyCanvas as the practical creation environment.',
    outcomes:[
      'Distinguish awareness from advocacy.',
      'Build an evidence-to-message chain.',
      'Choose an audience and a realistic desired action.',
      'Avoid misleading or exploitative climate communication.',
      'Design and evaluate a small digital climate campaign.'
    ],
    lessons:[
      {
        id:'04.1',title:'Awareness is not the same as advocacy',minutes:13,
        body:[
          'Awareness helps people know or understand an issue. Advocacy aims to influence attitudes, behaviour, institutional practice or public decisions. A campaign can raise awareness without creating a clear path to action.',
          'Effective advocacy defines a problem, a priority audience, a desired action, credible evidence and a channel suited to that audience. It also considers who is speaking and whether affected communities are represented fairly.',
          'WOMATE’s earlier teaching emphasised grounding advocacy in evidence, building coalitions, engaging decision-makers, amplifying women’s voices and tracking accountability. Canopy turns those principles into a repeatable campaign workflow.'
        ],
        keyIdea:'A strong advocacy message does not end with “be aware”; it gives the right audience a credible reason and pathway to act.',
        check:{question:'Which element most clearly turns awareness into advocacy?',options:['A beautiful graphic.','A specific desired action from a defined audience.','More hashtags.'],answer:1,explanation:'Advocacy needs an audience and an intended action or decision.'},
        sources:['sdg13']
      },
      {
        id:'04.2',title:'Evidence → insight → message → action',minutes:15,
        body:[
          'Responsible climate communication starts with evidence, not a slogan. The communicator identifies what is known, what remains uncertain and what conclusion the evidence reasonably supports.',
          'The next step is insight: why does this matter to this audience? The message then communicates that insight in clear language, and the call to action identifies what the audience can realistically do.',
          'Stories can make evidence human and memorable, but a personal story should not be presented as proof of a broad scientific claim. Evidence and lived experience strengthen each other when their roles are clear.'
        ],
        keyIdea:'Do not force evidence to fit a message. Build the message from the evidence.',
        check:{question:'A single person describes a flood experience. How should it be used?',options:['As proof that every flood is caused by climate change.','As lived experience that can accompany, but not replace, broader evidence.','It should never be used.'],answer:1,explanation:'Personal experience is valuable but should not be misrepresented as comprehensive scientific evidence.'},
        sources:['ipccConcepts']
      },
      {
        id:'04.3',title:'Audience, tone and responsible storytelling',minutes:15,
        body:[
          'The same message will not work equally well for a minister, a community association, students, business owners and a general social-media audience. Audience design considers what people already know, what they value, what authority they have and what action is feasible.',
          'Tone should fit the purpose. Urgency can be appropriate without exaggeration. Hope can motivate without denying risk. Community-centred communication should preserve dignity and avoid using people’s hardship merely as visual material.',
          'Responsible storytelling obtains appropriate consent, avoids stereotypes, distinguishes fact from opinion and does not invent statistics, quotations or institutional endorsements.'
        ],
        keyIdea:'Climate communication should be accurate enough to trust and human enough to act on.',
        check:{question:'Which practice is responsible?',options:['Use a dramatic statistic even if you cannot verify it.','Adapt the message to the audience while keeping the underlying evidence accurate.','Portray affected communities as helpless because it increases engagement.'],answer:1,explanation:'Audience adaptation should never require distortion.'},
        sources:['ipccConcepts']
      },
      {
        id:'04.4',title:'CanopyCanvas and campaign measurement',minutes:16,
        body:[
          'CanopyCanvas guides participants through cause selection, audience, desired action, message, tone, format, background, texture and a live campaign preview. The tool is intentionally focused: it supports climate and climate-wellbeing awareness rather than unrestricted graphic design.',
          'Participants download the finished campaign graphic to their own device, upload it to their own Google Drive, make the file viewable by link and attach that link to their Canopy assignment.',
          'Campaign evaluation should match the objective. Reach and impressions describe exposure; comments and shares can indicate engagement; link clicks or registrations can indicate response; a policy commitment or completed community action can indicate deeper influence. Vanity metrics alone do not prove impact.'
        ],
        keyIdea:'Measure the behaviour or decision you wanted — not only how many people saw the post.',
        check:{question:'If your goal is to get 50 people to register for a community clean-up, which metric matters most?',options:['Font size','Registrations','Total impressions only'],answer:1,explanation:'Registrations directly measure the intended action.'},
        sources:['sdg13']
      }
    ],
    caseStudy:{
      title:'The Future We Want · From vision board to action campaign',
      text:'Last year’s adaptation session asked participants to create a digital vision board for a climate-resilient Africa. Canopy evolves that creative exercise into an audience-specific campaign: the participant must connect the desired future to a credible action someone can take now.'
    },
    assignment:{
      paragraphPrompt:'Choose one climate issue you want to advocate on. Define the audience, the evidence you rely on, the insight that matters to that audience, the exact action you want, one ethical risk in communicating the issue, and how you would measure whether the campaign worked.',
      canvasBrief:'Use CanopyCanvas to create the campaign described in your paragraph. The final graphic must have a clear audience, responsible message and one actionable call to action.',
      puzzle:['ADVOCACY','EVIDENCE','AUDIENCE','ACTION'],
      rubric:{strategy:25,evidenceIntegrity:20,audienceFit:20,ethicalCommunication:20,measurement:15}
    },
    sources:['ipccConcepts','sdg13']
  },

  {
    id:'05',
    slug:'leadership-professional-pathways',
    weekLabel:'Week 7 & 8',
    liveDate:'22 October 2026',
    title:'Leadership & Professional Pathways',
    framingQuestion:'How can I lead climate action where I am, and where can that leadership take me professionally?',
    overview:'Bring the programme together by moving from knowledge to leadership practice, professional direction and a realistic 90-day climate action plan.',
    outcomes:[
      'Recognise multiple forms of climate leadership.',
      'Map personal strengths to climate roles and sectors.',
      'Build an evidence-based professional climate narrative.',
      'Develop a realistic 90-day action plan.',
      'Produce the one-page Climate Action Note required for programme completion.'
    ],
    lessons:[
      {
        id:'05.1',title:'Leadership without waiting for permission',minutes:13,
        body:[
          'Climate leadership is not limited to elected office, senior job titles or international conferences. It can take the form of research, organising, entrepreneurship, technical work, public service, communication, education, community coordination and professional influence.',
          'Leadership begins with responsibility: understanding the issue, knowing the limits of your expertise, listening to affected people, acting consistently and being accountable for results.',
          'WOMATE’s earlier teaching encouraged participants to organise local action, mobilise women and young people, engage decision-makers and use digital media to make women’s climate leadership visible. Canopy reframes these as leadership practices that can be developed deliberately.'
        ],
        keyIdea:'Climate leadership is demonstrated through informed action and accountability, not merely visibility.',
        check:{question:'Which best demonstrates climate leadership?',options:['Having “climate leader” in a biography.','Using evidence, convening others and following through on a useful climate action.','Attending the most events.'],answer:1,explanation:'Leadership is demonstrated through responsible action and follow-through.'},
        sources:['sdg13']
      },
      {
        id:'05.2',title:'Finding your professional pathway',minutes:15,
        body:[
          'Climate work cuts across sectors. Participants may contribute through policy, law, finance, agriculture, health, energy, technology, engineering, communications, research, data, education, entrepreneurship, conservation, urban planning, disaster risk reduction and many other fields.',
          'A pathway does not require abandoning an existing profession. A lawyer can work on climate regulation; a designer on public communication; a health professional on heat and disease risks; a technologist on climate information; an entrepreneur on low-carbon or adaptation solutions.',
          'The practical question is: what climate problem intersects with skills you already have or are willing to build?'
        ],
        keyIdea:'Climate is a field of problems across professions, not one narrow job category.',
        check:{question:'Which statement is most accurate?',options:['Only environmental scientists have climate careers.','Many existing professions have climate applications and pathways.','A climate career always requires a new university degree.'],answer:1,explanation:'Climate action requires diverse professional capabilities.'},
        sources:['sdg13']
      },
      {
        id:'05.3',title:'Your evidence-based leadership story',minutes:14,
        body:[
          'A credible professional narrative connects what you care about, what you know, what you have done and what you are building next. It should be specific enough to be believable.',
          'Instead of “I am passionate about climate change,” a participant can explain the problem she focuses on, the communities or systems involved, the skills she brings, one action or project she has completed and the next capability she wants to develop.',
          'Digital visibility can support professional growth, but substance should come first. A LinkedIn post, portfolio item or campaign is strongest when it documents real learning, evidence or action.'
        ],
        keyIdea:'Professional visibility should document substance rather than substitute for it.',
        check:{question:'Which introduction is stronger?',options:['I am passionate about everything climate.','I use communications and community research to make local adaptation evidence easier for young people and decision-makers to understand.'],answer:1,explanation:'It identifies skills, purpose and a specific contribution.'},
        sources:['sdg13']
      },
      {
        id:'05.4',title:'The 90-day Climate Action Note',minutes:16,
        body:[
          'The Climate Action Note turns programme learning into a small, credible commitment. It should define one problem, the participant’s intended contribution, the people or institution involved, three practical actions, a simple timeline and evidence that would show progress.',
          'A useful 90-day plan is deliberately limited. It might involve a research brief, a community learning activity, an advocacy campaign, a professional portfolio project, a prototype, a local partnership or another feasible contribution.',
          'Participants should also identify one risk or constraint and one support they need. This makes the plan more realistic and creates a basis for WOMATE’s 90-day follow-up.'
        ],
        keyIdea:'A small action completed and evaluated is stronger than an ambitious plan with no owner, timeline or evidence.',
        check:{question:'Which is the strongest 90-day objective?',options:['Solve climate change in Ghana.','By the end of 90 days, produce and present a two-page heat-risk brief to one local institution using verified evidence and community input.','Become a global climate leader.'],answer:1,explanation:'It is specific, feasible, time-bound and produces evidence of action.'},
        sources:['sdg13']
      }
    ],
    caseStudy:{
      title:'From participation to climate leadership',
      text:'Participants map one issue they now understand better, one capability they have strengthened, one network or institution they can engage, and one action they can complete within 90 days. This becomes the bridge from She Leads participation into WOMATE’s wider community.'
    },
    assignment:{
      paragraphPrompt:'Draft your one-page Climate Action Note: define the climate problem, why it matters, the contribution you can realistically make, who you need to engage, three actions for the next 90 days, one likely constraint, the support you need, and how you will know whether you made progress.',
      canvasBrief:'Create a CanopyCanvas graphic that communicates the public-facing part of your 90-day commitment without overstating what you can achieve.',
      puzzle:['LEADERSHIP','PATHWAY','NETWORK','IMPACT'],
      rubric:{clarity:20,feasibility:25,application:20,stakeholderPlan:20,measurement:15}
    },
    sources:['sdg13','ipccGlossary']
  }
];

export const canopyCurriculumMeta = {
  title:'She Leads Climate Mentorship',
  cohort:'Cohort 2 · 2026',
  theme:'From Climate Knowledge to Climate Leadership',
  programmePeriod:'24 September – 5 November 2026',
  graduationDate:'5 November 2026',
  liveSessionDay:'Thursday',
  liveSessionTime:'4:00 PM GMT',
  completion:{
    liveSessions:'Attend at least 4 of 5 live sessions.',
    assignments:'Complete all five compulsory weekly assignments satisfactorily.',
    finalNote:'Complete the one-page Climate Action Note.',
    graduation:'Participate in the virtual graduation.'
  }
};

export function getCanopyModule(idOrSlug){
  return canopyModules2026.find(m=>m.id===idOrSlug||m.slug===idOrSlug)||null;
}
