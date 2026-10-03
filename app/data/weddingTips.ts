export interface TipArticleSection {
  heading?: string
  paragraphs: string[]
  bullets?: string[]
}

export interface TipArticle {
  id: string
  category: string
  title: string
  abstract: string
  intro?: string[]
  sections: TipArticleSection[]
  conclusion?: string
}

export interface TipCategory {
  id: string
  label: string
  icon: string
}

export const TIP_CATEGORIES: TipCategory[] = [
  { id: 'all', label: 'All Topics', icon: 'i-lucide-layers' },
  { id: 'getting-started', label: 'First Decisions & Concept', icon: 'i-lucide-sparkles' },
  { id: 'guest-lists', label: 'Guest Lists & Capacity', icon: 'i-lucide-users' },
  { id: 'budgeting', label: 'Budget & Hidden Costs', icon: 'i-lucide-wallet' },
  { id: 'suppliers', label: 'Suppliers & Contracts', icon: 'i-lucide-briefcase' },
  { id: 'venues', label: 'Ceremony & Venues', icon: 'i-lucide-church' }
]

export const WEDDING_ARTICLES: TipArticle[] = [
  {
    id: 'first-10-wedding-decisions',
    category: 'getting-started',
    title: 'Newly Engaged? The First 10 Wedding Decisions to Make',
    abstract: 'Before rushing into booking suppliers or saving hundreds of inspiration photos, start with the core decisions that shape everything else—from dates and budget to guest size, priorities, and organization.',
    intro: [
      'You are engaged. You are excited. And suddenly, everyone starts asking questions:',
      'When is the wedding? Where will it be? How many guests? What is the theme?',
      'Before you rush into booking suppliers or saving hundreds of inspiration photos, start with the decisions that will shape everything else.'
    ],
    sections: [
      {
        heading: '1. When do you want to get married?',
        paragraphs: [
          'You do not need an exact date immediately.',
          'Start with a preferred month, season, or a few possible dates. This gives you enough flexibility when checking venues and suppliers.'
        ]
      },
      {
        heading: '2. How much are you comfortable spending?',
        paragraphs: [
          'Talk about your budget early.',
          'Discuss how much you can realistically spend, who may be contributing, and how much flexibility you have.',
          'It is much easier to enjoy wedding planning when your choices are grounded in a number you are comfortable with.'
        ]
      },
      {
        heading: '3. How big do you want the wedding to be?',
        paragraphs: [
          'Think about the kind of celebration you want before writing hundreds of names.',
          'Would you prefer an intimate wedding or a full room of family and friends?',
          'Set an ideal guest count and a maximum guest count.'
        ]
      },
      {
        heading: '4. What matters most to both of you?',
        paragraphs: [
          'Choose your top three priorities.',
          'It may be food, photography, music, styling, your venue, or simply having the people you love there.',
          'These priorities will help you decide where to spend more and where you can keep things simple.'
        ]
      },
      {
        heading: '5. What kind of ceremony do you want?',
        paragraphs: [
          'Church wedding, civil ceremony, garden wedding, or another type of celebration?',
          'This decision affects your venue, requirements, officiant, and timeline.'
        ]
      },
      {
        heading: '6. Where do you want to celebrate?',
        paragraphs: [
          'Think beyond how a venue looks.',
          'Consider location, guest capacity, accessibility, parking, weather, food options, and how convenient it will be for the people attending.'
        ]
      },
      {
        heading: '7. What do you want the wedding to feel like?',
        paragraphs: [
          'You do not need a complete theme yet. Start with the feeling.',
          'Do you want it to be elegant, romantic, relaxed, modern, intimate, festive, or traditional? That feeling can guide your styling and supplier choices later.'
        ]
      },
      {
        heading: '8. How much help will you need?',
        paragraphs: [
          'Be realistic about your schedules.',
          'Will you hire a planner, get a coordinator, or manage most of the planning yourselves? The right answer depends on your time, budget, and how involved you want to be.'
        ]
      },
      {
        heading: '9. Which suppliers should you book first?',
        paragraphs: [
          'Prioritize suppliers who can only accommodate one wedding, or a very limited number of weddings, on the same day.',
          'This may include your venue, planner, photographer, videographer, host, hair and makeup artist, or other suppliers whose availability is tied closely to your date.',
          'If there is someone you really want, check availability early. Suppliers who can handle several weddings on the same day may give you a little more flexibility.'
        ]
      },
      {
        heading: '10. Where will you keep all the details?',
        paragraphs: [
          'Wedding information adds up quickly.',
          'Guest names, quotations, contracts, payments, deadlines, schedules, and ideas can easily end up scattered across messages and notes.',
          'Choose one place where both of you can see what has been decided and what still needs attention.'
        ]
      }
    ],
    conclusion: 'You do not need to have your whole wedding figured out in the first week. You just need to make the decisions that make the next decisions easier. Start with the foundation. The details can come later.'
  },
  {
    id: 'how-big-wedding-should-be',
    category: 'guest-lists',
    title: 'How to Decide How Big Your Wedding Should Be',
    abstract: 'Choosing your guest count comes down to the feeling you want, your budget, venue capacity, and family expectations. Setting an ideal and maximum range gives you flexibility while staying true to your celebration.',
    intro: [
      'One of the first big wedding decisions is also one of the most personal: How many people do we really want there?',
      'A bigger wedding means more people to celebrate with. A smaller wedding can feel more intimate and easier to manage. Neither is better. What matters is choosing the size that fits the kind of day you actually want.'
    ],
    sections: [
      {
        heading: 'Start with the feeling',
        paragraphs: [
          'Picture your wedding day. Do you imagine a full room with lots of energy, family, and friends? Or do you want something more intimate, where you can spend real time with almost everyone there?',
          'Your answer already gives you a clue.'
        ]
      },
      {
        heading: 'Check what your budget can comfortably handle',
        paragraphs: [
          'Every additional guest affects more than just the meal.',
          'It can mean more tables, chairs, invitations, drinks, favors, transportation, and even a bigger venue.',
          'A guest list can grow faster than the budget if you are not careful.'
        ]
      },
      {
        heading: 'Think about your venue',
        paragraphs: [
          'Do not only ask how many people the venue can fit. Ask how many people it can fit comfortably once you add tables, styling, the dance floor, technical equipment, and other setups.',
          'Maximum capacity and comfortable capacity are not always the same.'
        ]
      },
      {
        heading: 'Talk about family expectations early',
        paragraphs: [
          'Parents may already have people in mind. It is better to discuss this at the start than after the guest list is already full.',
          'You can agree on how many guests each side may invite and which relationships should be prioritized.'
        ]
      },
      {
        heading: 'Ask yourselves',
        paragraphs: [
          'These questions can make the answer much clearer:'
        ],
        bullets: [
          'Do we want to know almost everyone in the room?',
          'Are we comfortable inviting people we rarely see?',
          'Would we rather spend more per guest on a smaller wedding?',
          'Would a larger guest list force us to compromise on things we care about more?',
          'Are we choosing this number because it feels right, or because we feel expected to?'
        ]
      },
      {
        heading: 'Give yourselves a range',
        paragraphs: [
          'Instead of starting with one fixed number, set an ideal guest count and a maximum guest count. This gives you flexibility without letting the wedding grow endlessly.'
        ]
      }
    ],
    conclusion: 'Your wedding does not need to be big to feel special. It also does not need to be small to feel meaningful. Choose the size that gives you the celebration you want, with the people you truly want to share it with.'
  },
  {
    id: 'ideal-vs-maximum-guest-count',
    category: 'guest-lists',
    title: 'Ideal Guest Count vs. Maximum Guest Count: Why You Need Both',
    abstract: 'Defining both an ideal count (comfort zone) and a maximum count (firm ceiling) prevents your guest list from spiraling out of control while leaving room for inevitable changes and waitlists.',
    intro: [
      'One of the easiest ways for a wedding guest list to get out of control is to have only one number in mind.',
      'It helps to decide on two:'
    ],
    sections: [
      {
        heading: 'Your ideal guest count',
        paragraphs: [
          'This is the number that feels right for your wedding. It fits your budget, your venue, and the kind of celebration you want.'
        ]
      },
      {
        heading: 'Your maximum guest count',
        paragraphs: [
          'This is your ceiling. It is the number you do not want to go beyond, even when more names start getting added.'
        ]
      },
      {
        heading: 'Why do you need both?',
        paragraphs: [
          'Because guest lists almost always change.',
          'Parents may ask to add relatives or friends. You may remember someone important later. Some guests may decline. Others may ask about bringing a plus one.',
          'Having two numbers gives you room to adjust without losing control.'
        ]
      },
      {
        heading: 'Think of your ideal count as your comfort zone',
        paragraphs: [
          'This is the number you should use when looking at venues, getting catering estimates, and planning the overall size of the wedding. It gives you space to breathe.'
        ]
      },
      {
        heading: 'Think of your maximum count as your boundary',
        paragraphs: [
          'Once you reach this number, every additional guest affects something else. It may mean a bigger venue, more tables, more food, more invitations, or a higher bill.',
          'That is why your maximum should be a real limit, not just a number you hope to follow.'
        ]
      },
      {
        heading: 'Keep a waitlist',
        paragraphs: [
          'You may have people you would love to invite if space opens up. Keep them on a separate waitlist instead of adding them immediately to your main guest list.',
          'As regrets come in, you can invite from this list while still staying within your maximum count.'
        ]
      },
      {
        heading: 'Keep a small invitation buffer',
        paragraphs: [
          'If you are ordering printed invitations, consider ordering a few extra sets. They can be used for waitlisted guests, late additions, or replacements if an invitation gets damaged or lost.',
          'A small buffer is usually easier than placing another print order later.'
        ]
      },
      {
        heading: 'A useful question to ask',
        paragraphs: [
          'If we invite this person, are we still within the kind of wedding we planned? That one question can help when the list starts growing.'
        ]
      }
    ],
    conclusion: 'Your guest list can change. Your limits should still guide the decision. Know the number that feels right, the number you will not go beyond, and who you would invite if space opens up.'
  },
  {
    id: 'build-first-wedding-guest-list',
    category: 'guest-lists',
    title: 'How to Build Your First Wedding Guest List',
    abstract: 'Building your guest list is an iterative sorting process. Identify must-haves, establish fair ground rules (plus-ones, kids, coworkers), maintain a waitlist, and align with family early on.',
    intro: [
      'Making the guest list sounds simple until you actually start writing names.',
      'Suddenly, you are deciding whether to invite a cousin you have not seen in years, your parents’ friends, coworkers, children, plus ones, and people you like but may not have room for.',
      'Start by remembering one thing: You are not making the final guest list yet. You are building your first one. Write down everyone you might want to invite first. Then start sorting.'
    ],
    sections: [
      {
        heading: 'Who are your must invite guests?',
        paragraphs: [
          'These are the people you would genuinely miss if they were not there. Think immediate family, closest friends, and people who are truly part of your lives.',
          'If you are unsure about someone, ask yourselves:'
        ],
        bullets: [
          'Do we still have a real relationship with this person?',
          'Have we spoken or spent time together recently?',
          'Would we genuinely notice if they were not there?',
          'Are we inviting them because we want them there or because we feel guilty?',
          'Would we still invite them if we personally had to pay for their seat?'
        ]
      },
      {
        heading: 'Create a waitlist',
        paragraphs: [
          'Not everyone has to be either “invited” or “not invited.” You can create a second list for people you would love to include if space opens up.',
          'This is especially helpful when your venue or budget has a clear limit. As guests decline, you can invite people from this list without going beyond your maximum guest count.'
        ]
      },
      {
        heading: 'Talk about parents’ guests early',
        paragraphs: [
          'Parents may have relatives, family friends, or colleagues they hope to invite. Discuss this before the list becomes final.',
          'You can agree on a reasonable number of guests for each side so everyone knows the limits from the start.'
        ]
      },
      {
        heading: 'Decide your rules',
        paragraphs: [
          'Some guest list decisions become easier when you agree on the rules first. You do not have to follow what other couples do. You just need rules that feel fair and that you can apply consistently:'
        ],
        bullets: [
          'Are children invited?',
          'Who gets a plus one?',
          'Are coworkers included?',
          'What about relatives you rarely see?'
        ]
      },
      {
        heading: 'Keep a little room',
        paragraphs: [
          'Do not fill every available seat immediately. Plans change. Family situations change. You may remember someone important later.',
          'And when ordering printed invitations, consider ordering a few extra sets for your waitlisted guests, late additions, or replacements. A small buffer can save you from having to place another print order later.'
        ]
      }
    ],
    conclusion: 'Most importantly, protect the kind of wedding you want. A guest list should not become a collection of people you feel obligated to invite. It should reflect the people you want to share the day with, while still respecting your budget and venue. You will probably move names around more than once. That is normal. The goal is not to create a perfect list on your first try. The goal is to create a guest list that feels right for the two of you.'
  },
  {
    id: 'realistic-wedding-budget',
    category: 'budgeting',
    title: 'How to Create a Realistic Wedding Budget',
    abstract: 'A realistic budget starts with a firm spending limit, prioritizes what matters most to you, tracks commitments versus cash flow, and protects you with an intentional contingency fund.',
    intro: [
      'Talking about the wedding budget may not be the most exciting part of planning, but it is one of the most important.',
      'A clear budget helps you make decisions with less stress and fewer surprises later.'
    ],
    sections: [
      {
        heading: 'Start with the total amount you are comfortable spending',
        paragraphs: [
          'Before looking at packages and suppliers, agree on a number that feels manageable.',
          'Include any contributions from parents or family only if they are confirmed. Try not to build your budget around money you are only hoping to receive.'
        ]
      },
      {
        heading: 'Know what matters most to you',
        paragraphs: [
          'Your budget does not have to be divided equally.',
          'If food, photography, or your venue is one of your top priorities, it is okay to spend more there and keep other areas simpler.',
          'Spend based on what matters to you, not on what every wedding is “supposed” to have.'
        ]
      },
      {
        heading: 'Get actual quotations early',
        paragraphs: [
          'Wedding costs can vary widely depending on the date, location, guest count, and supplier.',
          'Once you have your initial guest count, get real quotations from the suppliers you are seriously considering. This will tell you very quickly whether your first budget is realistic.'
        ]
      },
      {
        heading: 'Look at the total cost, not just the package price',
        paragraphs: [
          'A package may look affordable at first, but ask what is not included.',
          'Check for delivery fees, corkage, overtime, transportation, accommodation, crew meals, taxes, service charges, and other possible add ons. The cheapest quotation is not always the lowest final cost.'
        ]
      },
      {
        heading: 'Keep a contingency fund',
        paragraphs: [
          'Do not allocate every peso from the start.',
          'Leave room for unexpected expenses, price changes, additional guests, and small things you may only discover later in the planning process. A little breathing room can make the final months much easier.'
        ]
      },
      {
        heading: 'Track what you have committed to',
        paragraphs: [
          'There is a big difference between your planned budget and the amount you have already committed through signed contracts and deposits.',
          'Keep track of the contract amount, amount paid, remaining balance, and payment due dates. This helps you see your real financial position at any point in the planning.'
        ]
      },
      {
        heading: 'Ask yourselves before spending',
        paragraphs: [
          'Run through these quick checks before confirming expenses:'
        ],
        bullets: [
          'Do we really want this?',
          'Does it support one of our priorities?',
          'Is there room for it in the budget?',
          'What are we willing to spend less on if we choose this?'
        ]
      }
    ],
    conclusion: 'A wedding budget is not meant to stop you from enjoying your wedding. It is there to help you spend confidently on the things that matter most. Set your limit early, track it honestly, and leave room for the unexpected.'
  },
  {
    id: 'forgotten-wedding-expenses',
    category: 'budgeting',
    title: 'Wedding Expenses Couples Commonly Forget to Budget For',
    abstract: 'Hidden costs like crew meals, transport, corkage, overtime, alterations, printing, and permits can quietly drain your budget if not planned for early.',
    intro: [
      'Most couples remember the big expenses: Venue. Food. Photo and video. Styling. Attire.',
      'It is usually the smaller costs that surprise you later. They may not seem significant on their own, but together they can take a noticeable bite out of your budget.'
    ],
    sections: [
      {
        heading: 'Supplier meals',
        paragraphs: [
          'Your planner, photographers, videographers, technical team, musicians, and other suppliers may need meals depending on their call time and contract.',
          'Check early so you can include these in your catering count.'
        ]
      },
      {
        heading: 'Transportation',
        paragraphs: [
          'Think beyond the bridal car.',
          'You may need transportation for the entourage, family members, guests, suppliers, or items that need to be moved between venues.'
        ]
      },
      {
        heading: 'Delivery, setup, and pickup fees',
        paragraphs: [
          'Some quotations do not include delivery or out of town charges.',
          'Ask whether setup, pickup, ingress, egress, or transportation fees are already included.'
        ]
      },
      {
        heading: 'Corkage and venue charges',
        paragraphs: [
          'Your venue may charge additional fees for outside caterers, alcohol, mobile bars, technical suppliers, food carts, or other outside vendors.',
          'Always ask before booking a supplier.'
        ]
      },
      {
        heading: 'Overtime',
        paragraphs: [
          'Weddings do not always end exactly on schedule.',
          'Check the overtime rates of your venue and major suppliers so you know what happens if the program runs late.'
        ]
      },
      {
        heading: 'Printing and stationery',
        paragraphs: [
          'Invitations are only one part of the printing budget. You may also need table numbers, seating charts, welcome signs, menus, missalettes, favor cards, or other printed materials.'
        ]
      },
      {
        heading: 'Attire extras',
        paragraphs: [
          'Alterations, shoes, accessories, undergarments, steaming, cleaning, and last minute adjustments can easily be forgotten.'
        ]
      },
      {
        heading: 'Marriage and church requirements',
        paragraphs: [
          'Set aside funds for documents, seminars, certificates, church fees, and other requirements that may apply to your ceremony.'
        ]
      },
      {
        heading: 'Accommodation and preparation rooms',
        paragraphs: [
          'Do you need hotel rooms for the night before, preparation rooms, or accommodation for family members, suppliers, or your officiant? Add these before the final weeks.'
        ]
      },
      {
        heading: 'Last minute purchases',
        paragraphs: [
          'Something always seems to come up: extra umbrellas, safety pins, snacks, extension cords, additional printing, and replacement items. This is one reason your budget should always have a buffer.'
        ]
      }
    ],
    conclusion: 'Before signing any contract, ask: "What is not included in this price?" That simple question can reveal more than the total on the quotation. Budget for the wedding you planned, but leave room for the things you did not expect.'
  },
  {
    id: 'wedding-package-vs-a-la-carte',
    category: 'suppliers',
    title: 'Wedding Package vs. À La Carte Suppliers: Which Is Better for You?',
    abstract: 'Evaluate the convenience and simplicity of packaged wedding deals against the creative control and customization of booking à la carte suppliers, or choose a hybrid approach.',
    intro: [
      'One of the first choices couples face is whether to book a wedding package or choose suppliers one by one. Both can work.',
      'The better option depends on how much convenience, flexibility, and control you want.'
    ],
    sections: [
      {
        heading: 'A wedding package can make planning easier',
        paragraphs: [
          'Packages are convenient because several services are already grouped together. This can save time and make budgeting simpler.',
          'But packages can also be limited. You may have fewer choices when it comes to suppliers, styles, menu options, hours, setup, or output. Some packages also have fixed inclusions that you may not really need.',
          'Before booking, ask if you can replace suppliers, remove inclusions, or upgrade certain parts of the package.'
        ]
      },
      {
        heading: 'À la carte gives you more freedom',
        paragraphs: [
          'Booking suppliers separately lets you choose the people and services you really want. You can spend more on your priorities and keep other areas simple.',
          'This is useful if you are particular about your photographer, caterer, stylist, host, or other key suppliers. The tradeoff is that you may need to spend more time comparing proposals and coordinating everyone.'
        ]
      },
      {
        heading: 'Compare more than the price',
        paragraphs: [
          'A package may seem cheaper, but check what is actually included. Ask:'
        ],
        bullets: [
          'Are there limits on hours, guests, setup, or output?',
          'Can we choose the actual supplier?',
          'Can we customize the package?',
          'Will we get a discount if we remove something?',
          'Are transportation, overtime, taxes, and other charges included?'
        ]
      },
      {
        heading: 'A mix can also work',
        paragraphs: [
          'You do not have to choose only one approach.',
          'Some couples book a package for the services they are flexible about, then separately book the suppliers that matter most to them.'
        ]
      }
    ],
    conclusion: 'The best option is the one that gives you the right balance of convenience and choice. A package may save time, but make sure you are not giving up the things that matter most to you.'
  },
  {
    id: 'wedding-mood-board',
    category: 'getting-started',
    title: 'How to Create a Wedding Mood Board That Actually Helps Your Suppliers',
    abstract: 'A functional mood board provides aesthetic cohesion for your suppliers. Focus on emotion, common visual threads, and annotated notes explaining what you love about each reference.',
    intro: [
      'A wedding mood board is not just a collection of pretty photos.',
      'It gives you a clear direction for the wedding and helps you see which ideas actually belong together.'
    ],
    sections: [
      {
        heading: 'Start with how you want the wedding to feel',
        paragraphs: [
          'Choose a few words that describe the celebration you imagine: Elegant? Warm? Romantic? Modern? Relaxed? Classic?',
          'Then collect photos that reflect that feeling.'
        ]
      },
      {
        heading: 'Use it to filter your ideas',
        paragraphs: [
          'You will probably see many things you like while planning. But liking something does not always mean it fits your wedding.',
          'When you find a new idea, compare it with your mood board. Does it belong with everything else? If not, you can appreciate it without adding it to your wedding.',
          'This keeps your choices more consistent and makes decision making easier.'
        ]
      },
      {
        heading: 'Look for the common thread',
        paragraphs: [
          'After saving your inspiration, step back and look at everything together. You may notice that you keep choosing similar colors, flowers, lighting, textures, or table settings.',
          'Those patterns help define the direction of your wedding.'
        ]
      },
      {
        heading: 'Share the bigger picture with your suppliers',
        paragraphs: [
          'Your mood board should not only tell the florist what flowers you like or the stylist what tables you want. It gives all your suppliers perspective on the wedding as a whole.',
          'A florist can understand the atmosphere you are creating. Your invitation designer can see what fits the styling. Your cake designer can understand the overall look rather than designing the cake in isolation.',
          'This helps everyone create something that feels like it belongs to the same wedding.'
        ]
      },
      {
        heading: 'Add simple notes',
        paragraphs: [
          'Tell suppliers exactly what caught your attention in a reference:'
        ],
        bullets: [
          '“Love the lighting.”',
          '“Like the colors, not the flowers.”',
          '“Love the simplicity of the table.”',
          '“Like the overall mood.”'
        ]
      }
    ],
    conclusion: 'Your mood board does not have to show exactly what your wedding will look like. It should show where you are going. A good mood board helps you choose what fits, let go of what does not, and gives your suppliers one clear picture of the wedding you are creating.'
  },
  {
    id: 'how-to-use-pinterest',
    category: 'getting-started',
    title: 'How to Use Pinterest for Wedding Planning Without Getting Overwhelmed',
    abstract: 'Pinterest can easily lead to inspiration overload. Learn how to curate focused boards, question why you love an image, and separate styled shoots from real-world practicality.',
    intro: [
      'Pinterest is great for wedding inspiration. It is also one of the fastest ways to make yourself feel like you need ten different weddings at once.',
      'The goal is not to save everything you like. The goal is to discover what actually fits your wedding.'
    ],
    sections: [
      {
        heading: 'Start broad, then narrow down',
        paragraphs: [
          'At the beginning, save freely. Look at venues, flowers, dresses, invitations, tables, lighting, cakes, and other details that catch your attention.',
          'After a while, go back and review what you saved. You will usually start seeing a pattern.'
        ]
      },
      {
        heading: 'Ask why you saved each photo',
        paragraphs: [
          'Do you like the whole setup? Or just the lighting? The flowers? The color? The simplicity?',
          'Knowing what you actually like about a photo makes it much easier to use later.'
        ]
      },
      {
        heading: 'Create separate boards',
        paragraphs: [
          'Instead of putting everything into one giant board, organize your ideas. You can have separate boards for styling, attire, flowers, invitations, cake, ceremony, and reception.',
          'This makes it easier when you need to share references with a specific supplier.'
        ]
      },
      {
        heading: 'Remember that not everything on Pinterest is practical',
        paragraphs: [
          'Some photos are styled shoots, showcase setups, or created mainly for photos. They may look beautiful, but that does not always mean they are ideal, realistic, or even practical for an actual wedding.',
          'A setup may be too expensive, too delicate, too time consuming to install, unsuitable for your venue, or difficult for guests to move around in. Some details look great in pictures but may not work well in real life.',
          'That is why it helps to ask:'
        ],
        bullets: [
          'Does this fit our budget?',
          'Does this work in our venue?',
          'Is this practical for our guest count?',
          'Will this still work outside a styled photo?'
        ]
      },
      {
        heading: 'Do not let one beautiful photo change your whole direction',
        paragraphs: [
          'You will keep seeing new ideas throughout the planning process. Before adding something new, ask:'
        ],
        bullets: [
          'Does this still fit our mood board?',
          'Does it fit our venue?',
          'Does it fit our budget?',
          'Does it feel like us?'
        ]
      }
    ],
    conclusion: 'Use Pinterest as a guide, not a standard. Pinterest is helpful because it gives you ideas and helps you discover your taste. But your wedding does not need to look exactly like the photos you save. It needs to work for your real venue, your real budget, and your real celebration. Save what inspires you, notice what repeats, and choose what is beautiful and realistic for the wedding you are actually planning.'
  },
  {
    id: 'inspiration-into-clear-concept',
    category: 'getting-started',
    title: 'How to Turn Wedding Inspiration Into a Clear Wedding Concept',
    abstract: 'Turn fragmented ideas and aesthetic bookmarks into one coherent design identity that grounds every styling decision and guides your creative team.',
    intro: [
      'It is easy to collect inspiration. The harder part is turning all those saved photos, ideas, colors, and details into one wedding that actually feels connected.',
      'A clear wedding concept helps you make better choices and gives your suppliers one direction to work from.'
    ],
    sections: [
      {
        heading: 'Start with the feeling',
        paragraphs: [
          'Before choosing colors or flowers, decide how you want the wedding to feel: Elegant? Warm? Romantic? Modern? Intimate? Festive?',
          'This becomes your filter when making design decisions.'
        ]
      },
      {
        heading: 'Look at what keeps repeating',
        paragraphs: [
          'Review your mood board and saved references. What colors keep appearing? What kind of flowers, lighting, tables, materials, or spaces are you drawn to?',
          'Those repeated choices usually tell you more about your style than one beautiful photo.'
        ]
      },
      {
        heading: 'Choose a few key elements',
        paragraphs: [
          'You do not need to define every detail at once. Start with a few things that will carry the concept throughout the wedding.',
          'This may include your color palette, flowers, lighting, materials, and overall styling direction. Once these are clear, smaller decisions become easier.'
        ]
      },
      {
        heading: 'Check if the idea fits your real wedding',
        paragraphs: [
          'A concept should work with your venue, guest count, budget, and schedule.',
          'A beautiful idea may not translate well if the venue already has a strong design, the setup is too complicated, or the cost takes away from something you care about more.',
          'Ask:'
        ],
        bullets: [
          'Does this work in our venue?',
          'Does it fit our budget?',
          'Does it still feel like us?',
          'Will it work for the whole wedding, not just one photo?'
        ]
      },
      {
        heading: 'Let your suppliers see the whole picture',
        paragraphs: [
          'Share your overall concept with your suppliers, not just the references related to their individual service.',
          'Your florist, cake designer, invitation designer, stylist, and other suppliers can make better choices when they understand the wedding as a whole. This helps everything feel connected instead of looking like separate ideas placed together.'
        ]
      }
    ],
    conclusion: 'You do not need a complicated theme. Sometimes a clear feeling, a thoughtful color palette, and a few consistent details are enough. Your wedding concept should make decisions easier, not give you more rules to follow. The goal is not to use every idea you love. It is to choose the ideas that belong together.'
  },
  {
    id: 'info-for-wedding-planner',
    category: 'suppliers',
    title: 'What Information Should You Give Your Wedding Planner at the Start?',
    abstract: 'Equip your coordinator or planner for success by sharing key dates, guest boundaries, open budgets, top priorities, family nuances, and confirmed contracts early.',
    intro: [
      'The more your planner understands your wedding from the beginning, the better they can guide you.',
      'You do not need to have everything figured out yet. But giving them a clear starting point can save time and avoid misunderstandings later.'
    ],
    sections: [
      {
        heading: 'Your wedding date and venues',
        paragraphs: [
          'Share your confirmed date and venue details, or the options you are still considering.',
          'If nothing is booked yet, tell your planner your preferred location and date range.'
        ]
      },
      {
        heading: 'Your guest count',
        paragraphs: [
          'Give both your ideal guest count and your maximum number.',
          'This helps your planner recommend venues, catering options, layouts, and suppliers that actually fit.'
        ]
      },
      {
        heading: 'Your working budget',
        paragraphs: [
          'Be open about the amount you are comfortable spending.',
          'A planner can give better advice when they know the real budget instead of suggesting options you may never consider.'
        ]
      },
      {
        heading: 'Your priorities',
        paragraphs: [
          'Tell your planner what matters most to both of you: Is it the food? Photography? Music? Styling? Guest experience?',
          'Also tell them what you are happy to keep simple.'
        ]
      },
      {
        heading: 'Your wedding inspiration',
        paragraphs: [
          'Share your mood board, saved photos, colors, and ideas. More importantly, explain what you like about them.',
          'This helps your planner understand the direction instead of simply copying a photo.'
        ]
      },
      {
        heading: 'Anything already booked',
        paragraphs: [
          'Provide the contracts and contact details of suppliers you have already confirmed.',
          'Tell your planner what has been paid, what is still due, and any agreements already made.'
        ]
      },
      {
        heading: 'Your family and wedding party',
        paragraphs: [
          'Share the names of important family members, principal sponsors, entourage, and anyone who may be involved in making decisions.',
          'If there are family situations your planner should handle carefully, it is better to mention them privately early on.'
        ]
      },
      {
        heading: 'Your non negotiables',
        paragraphs: [
          'Maybe you want a short program. Maybe there is a family tradition you definitely want included. Maybe there is something you absolutely do not want.',
          'Tell your planner. These details help them protect what matters to you while making recommendations.'
        ]
      },
      {
        heading: 'And tell them what you are unsure about',
        paragraphs: [
          'You do not need to arrive with all the answers. A good planner is there to help you work through them.'
        ]
      }
    ],
    conclusion: 'The clearer you are about your budget, priorities, people, and expectations, the easier it is for your planner to build a wedding that actually feels like yours.'
  },
  {
    id: 'compare-supplier-proposals',
    category: 'suppliers',
    title: 'How to Compare Wedding Supplier Proposals Properly',
    abstract: 'A side-by-side comparison of supplier quotes reveals crucial differences in inclusions, staffing, coverage hours, extra fees, and working rapport.',
    intro: [
      'Two supplier proposals can look similar at first and still be very different once you read the details.',
      'The lowest price is not always the best deal. The most expensive package is not automatically the best either. What matters is knowing exactly what you are comparing.'
    ],
    sections: [
      {
        heading: 'Compare the same things',
        paragraphs: [
          'Before looking at the total price, check whether the inclusions are actually similar.',
          'One supplier may include more hours, more staff, transportation, setup, or additional output. Another may charge for these separately.',
          'Make sure you are comparing like with like.'
        ]
      },
      {
        heading: 'Look beyond the package price',
        paragraphs: [
          'Ask what is not included.',
          'Check for transportation, accommodation, overtime, delivery, corkage, crew meals, taxes, service charges, and other possible fees. A quotation can look affordable until the extra costs are added later.'
        ]
      },
      {
        heading: 'Check the limits',
        paragraphs: [
          'Some packages have limits on hours, number of guests, output, locations, revisions, or setup.',
          'These details can matter more than an extra inclusion you may never use.'
        ]
      },
      {
        heading: 'Ask who will actually handle your wedding',
        paragraphs: [
          'For some suppliers, the person you meet may not be the person assigned to your event.',
          'If you are booking because you like a particular photographer, stylist, host, or artist, confirm who will personally be there.'
        ]
      },
      {
        heading: 'Think about what you actually need',
        paragraphs: [
          'More inclusions do not always mean better value. A package with twenty items is not useful if you only need ten of them. Ask yourself:'
        ],
        bullets: [
          'Will we actually use this?',
          'Does this support one of our priorities?',
          'Would we rather spend the difference somewhere else?'
        ]
      },
      {
        heading: 'Compare experience and fit too',
        paragraphs: [
          'Price matters, but so do reliability, communication, style, experience, and how comfortable you feel working with the supplier.',
          'You may be working with them for months before the wedding. A good working relationship can make the planning process much easier.'
        ]
      },
      {
        heading: 'Put the proposals side by side',
        paragraphs: [
          'Create a simple comparison showing:'
        ],
        bullets: [
          'Total price',
          'Inclusions',
          'Extra charges',
          'Hours covered',
          'Number of staff',
          'Payment terms',
          'Cancellation or rescheduling terms',
          'Important limitations'
        ]
      }
    ],
    conclusion: 'The best proposal is not always the cheapest or the longest. It is the one that gives you the right service, the right value, and the right fit for your wedding.'
  },
  {
    id: 'check-before-paying-deposit',
    category: 'suppliers',
    title: 'What to Check Before Paying a Wedding Supplier Deposit',
    abstract: 'Sending a deposit legally binds your booking. Verify exact services, refund policies, full project cost, scheduled payment terms, and assigned staff before paying.',
    intro: [
      'Paying a deposit usually means you are officially reserving a supplier for your wedding.',
      'Before you send the payment, take a few minutes to check the details carefully. A deposit may only be the first payment, but it usually comes with important terms and commitments.'
    ],
    sections: [
      {
        heading: 'Make sure you are booking the right service',
        paragraphs: [
          'Check that the wedding date, venue, package, and inclusions are correct.',
          'If you discussed any upgrades, special arrangements, or additional services, make sure these are reflected in the written proposal or contract. Do not rely only on what was discussed during a meeting or chat.'
        ]
      },
      {
        heading: 'Understand what the deposit means',
        paragraphs: [
          'Not all deposits work the same way.',
          'Ask whether the payment officially reserves your date and whether it will be deducted from the total contract amount. You should also know if the deposit is refundable, transferable, or forfeited if the wedding is moved or cancelled.',
          'These details are much easier to understand before you pay than when plans suddenly change.'
        ]
      },
      {
        heading: 'Check the total cost, not just the deposit',
        paragraphs: [
          'A small deposit can make a package feel affordable, but always look at the full amount you are committing to.',
          'Ask about possible additional charges such as transportation, accommodation, overtime, delivery, setup, taxes, corkage, or other fees. This gives you a more accurate picture of what the supplier will actually cost.'
        ]
      },
      {
        heading: 'Review the payment schedule',
        paragraphs: [
          'Check when the next payments are due and how much each one will be. This is especially important when you are booking several suppliers around the same time.',
          'You may be able to afford the total wedding budget but still run into cash flow problems if too many large payments fall due in the same month.'
        ]
      },
      {
        heading: 'Read the cancellation and rescheduling terms',
        paragraphs: [
          'No couple plans to cancel or move a wedding, but it is still important to understand what happens if plans change.',
          'Check whether your deposit can be transferred to another date, whether rebooking fees apply, and what happens if the supplier is no longer available.'
        ]
      },
      {
        heading: 'Confirm who will actually handle your wedding',
        paragraphs: [
          'This matters when you are booking a supplier because of a specific person or team. If you chose a particular photographer, host, makeup artist, planner, or stylist, confirm whether that person will personally handle your wedding.',
          'Some companies have several teams, so it is better to know this before paying.'
        ]
      },
      {
        heading: 'Keep a complete record',
        paragraphs: [
          'Once you pay, save the contract, quotation, receipt, and important written agreements in one place.',
          'You should always be able to check how much you have paid, how much is still due, when the next payment is due, and exactly what is included in your booking.'
        ]
      }
    ],
    conclusion: 'A deposit should not feel like a leap of faith. Before paying, make sure you understand what you are booking, how much it will really cost, and what happens if plans change.'
  },
  {
    id: 'read-supplier-contract',
    category: 'suppliers',
    title: 'How to Read a Wedding Supplier Contract Before Signing',
    abstract: 'Demystify vendor contracts by checking scope alignment, omitted fees, payment milestones, rescheduling terms, replacement guarantees, and liability clauses.',
    intro: [
      'A wedding contract can look intimidating, but you do not need to understand every legal term to review it properly.',
      'What matters is knowing exactly what the supplier promised, what you are expected to do, and what happens if plans change. Before signing, go through the contract with these questions in mind.'
    ],
    sections: [
      {
        heading: 'Does the contract match what you discussed?',
        paragraphs: [
          'Check the wedding date, venue, package, hours of service, number of staff, deliverables, and inclusions.',
          'If the supplier promised something during a meeting or chat, make sure it also appears in the contract. A verbal promise is much harder to rely on later.'
        ]
      },
      {
        heading: 'What is not included?',
        paragraphs: [
          'Sometimes the most important part of a contract is what is missing.',
          'Check whether transportation, accommodation, overtime, setup, delivery, crew meals, taxes, or other charges are separate. Ask for clarification before signing if anything is unclear.'
        ]
      },
      {
        heading: 'When are the payments due?',
        paragraphs: [
          'Review the total contract amount, deposit, succeeding payments, and final balance. Make sure the payment schedule works with the rest of your wedding expenses.',
          'Also check what happens if a payment is late.'
        ]
      },
      {
        heading: 'What happens if the wedding date changes?',
        paragraphs: [
          'Look for the rescheduling terms. Can your payment be transferred to a new date? Is there a rebooking fee? What happens if the supplier is already booked on your new date?',
          'Understanding this now can save a difficult conversation later.'
        ]
      },
      {
        heading: 'What happens if you cancel?',
        paragraphs: [
          'Check which payments are refundable and which are not. You should also know whether there are cancellation fees and when they apply.'
        ]
      },
      {
        heading: 'What happens if the supplier cannot perform?',
        paragraphs: [
          'Ask what happens if the person or team you booked becomes unavailable. Will they provide a replacement? Will you be allowed to approve the replacement? Will you receive a refund if no suitable replacement is available?',
          'This is especially important if you are booking a supplier because of a particular person.'
        ]
      },
      {
        heading: 'Are there limits you should know about?',
        paragraphs: [
          'Check whether the package has limits on hours, locations, revisions, number of guests, output, setup, or use of equipment. These details can affect your wedding more than an extra free inclusion.'
        ]
      },
      {
        heading: 'Do you understand the cancellation, refund, and liability terms?',
        paragraphs: [
          'Do not skip these sections just because you hope you will never need them. If something feels too broad, unclear, or unfair, ask the supplier to explain it before you sign.'
        ]
      },
      {
        heading: 'Keep your own copy',
        paragraphs: [
          'Once the contract is signed, save the final version together with your quotation, payment receipts, and important written agreements. You should always be able to go back and confirm what was agreed.'
        ]
      }
    ],
    conclusion: 'A wedding contract should give both you and the supplier clarity. If something is important to you, do not assume it is understood. Make sure it is written.'
  },
  {
    id: 'choose-ceremony-venue',
    category: 'venues',
    title: 'How to Choose Your Wedding Ceremony Venue',
    abstract: 'Selecting a ceremony venue requires looking beyond aesthetics to practical logistics: ceremony restrictions, guest comfort, travel time to reception, setup windows, and backup rain plans.',
    intro: [
      'Your ceremony venue sets the tone for the entire wedding day.',
      'It is also one of the first decisions that can affect your date, guest count, transportation, styling, and even the reception schedule. So choose it for more than just how beautiful it looks.'
    ],
    sections: [
      {
        heading: 'Start with the type of ceremony you want',
        paragraphs: [
          'Will you have a church wedding, civil ceremony, garden ceremony, or another type of celebration? Your choice may come with specific requirements, restrictions, or documents that need to be completed before the wedding.',
          'If you are getting married in a church or religious venue, ask about the requirements and available dates before making other major bookings.'
        ]
      },
      {
        heading: 'Think about your guest count',
        paragraphs: [
          'Make sure the space can comfortably accommodate the number of people you expect. Do not look only at maximum capacity.',
          'Think about seating, aisles, accessibility, ventilation, and whether guests will still feel comfortable once the venue is fully set up.'
        ]
      },
      {
        heading: 'Consider the location',
        paragraphs: [
          'Think about how easy it will be for guests to reach the ceremony. If your reception is in another venue, check the travel time between the two.',
          'A beautiful ceremony venue can create problems if guests have to travel too far, deal with difficult parking, or rush to the reception afterward.'
        ]
      },
      {
        heading: 'Ask what is allowed',
        paragraphs: [
          'Some venues have rules on flowers, candles, music, photography, decorations, suppliers, or ceremony timing.',
          'If you already have a particular setup in mind, check whether it is allowed before booking.'
        ]
      },
      {
        heading: 'Look at the actual schedule',
        paragraphs: [
          'Ask how much time you have before and after the ceremony: Can suppliers enter early to set up? Is there another wedding before or after yours? How much time will you have for photos?',
          'The answer can affect your entire wedding day timeline.'
        ]
      },
      {
        heading: 'Think about the weather',
        paragraphs: [
          'For outdoor ceremonies, always ask what happens if it rains: Where will the ceremony move? How quickly can the backup plan be activated? Will the alternative space still work for your guest count and styling?',
          'A rain plan should be part of the decision from the beginning, not something you figure out the week before.'
        ]
      },
      {
        heading: 'Visit the venue at a similar time of day',
        paragraphs: [
          'If possible, visit around the same time your ceremony will take place. You will get a better idea of the lighting, temperature, traffic, noise, and overall atmosphere.',
          'Photos online may not show these things.'
        ]
      }
    ],
    conclusion: 'The ceremony venue should be beautiful, but it also needs to work for your guests, your schedule, and the kind of ceremony you want. Choose the place where the ceremony will feel right and where the rest of the wedding day can still flow smoothly.'
  }
]
