export type SupplierTier = 'bread-basket' | 'loaf' | 'slice'

export interface DirectorySupplier {
  name: string
  tier: SupplierTier
  logo?: string
  tagline?: string
  badge?: string
  highlightOfMonth?: boolean
  website?: string
  location?: string
  categoryName?: string
}

export interface SupplierSubCategory {
  title: string
  vendors: DirectorySupplier[]
}

export interface SupplierCategory {
  id: string
  title: string
  icon: string
  subcategories: SupplierSubCategory[]
}

export const SUPPLIER_TIER_CONFIG = {
  'bread-basket': {
    label: 'Bread Basket',
    subtitle: 'Premier Partners',
    description: 'Premier highlighted suppliers with iconic portfolios, bespoke packages, and official verified partner status.',
    badgeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs',
    pillClass: 'bg-amber-100 text-amber-900 border-amber-300',
    icon: 'i-lucide-sparkles',
    breadIcon: 'i-lucide-crown'
  },
  'loaf': {
    label: 'Loaf',
    subtitle: 'Established Partners',
    description: 'Trusted, well-established industry mainstays with proven excellence and extensive wedding credentials.',
    badgeClass: 'bg-toast-600 text-white',
    pillClass: 'bg-toast-100 text-toast-900 border-toast-300',
    icon: 'i-lucide-badge-check',
    breadIcon: 'i-lucide-award'
  },
  'slice': {
    label: 'Slice',
    subtitle: 'Boutique & Rising',
    description: 'Agile boutique ateliers, rising creators, and specialized niche artisans delivering dedicated bespoke craft.',
    badgeClass: 'bg-stone-200 text-stone-800',
    pillClass: 'bg-white/80 text-stone-700 border-stone-200',
    icon: 'i-lucide-feather',
    breadIcon: 'i-lucide-sparkle'
  }
} as const

// Helper to construct suppliers with sensible defaults
function s(name: string, tier: SupplierTier = 'slice', options: Partial<DirectorySupplier> = {}): DirectorySupplier {
  return {
    name,
    tier,
    ...options
  }
}

export const SUPPLIERS_DIRECTORY_DATA: SupplierCategory[] = [
  {
    id: 'food-beverage',
    title: 'Food & Beverage',
    icon: 'i-lucide-utensils',
    subcategories: [
      {
        title: 'Catering Companies',
        vendors: [
          s('Bizu Catering Studio', 'bread-basket', {
            logo: '/images/suppliers/bizu.svg',
            tagline: 'Luxury French-inspired catering, bespoke dessert bars, and refined grand banquets.',
            location: 'Metro Manila & Destination'
          }),
          s('Chef Jessie', 'loaf', {
            tagline: 'Gourmet dining and international culinary masterclasses by Chef Jessie Sincioco.'
          }),
          s('Cibo D’ M Catering', 'loaf', {
            tagline: 'Modern Italian hospitality and celebratory feasts by Margarita Forés.'
          }),
          s('Florabel', 'loaf', {
            tagline: 'Bespoke contemporary fusion wedding dining & lavish reception experiences.'
          }),
          s('Via Mare', 'loaf', {
            tagline: 'Iconic Filipino heritage dining and authentic celebration specialties.'
          })
        ]
      },
      {
        title: 'Food Carts',
        vendors: [
          s('Potato Corner', 'loaf', { tagline: 'World-famous flavored fries cart favorite.' }),
          s('Tater’s', 'loaf', { tagline: 'Premium gourmet popcorn and snack stations.' }),
          s('Lil’ Orbits Mini Donuts', 'loaf', { tagline: 'Freshly fried hot cinnamon & sugar mini donuts on wheels.' }),
          s('Ay Sauce Street Food', 'slice'),
          s('Berry’s Deli Hotdog Cart', 'slice'),
          s('Lisa’s Bibingka', 'slice'),
          s('Mamang Sorbetero by Crystalyn Sorbetes Ice Cream', 'slice'),
          s('Mang Felix Taho', 'slice'),
          s('Soy Bueno Taho', 'slice'),
          s('Tako Bar MNL', 'slice'),
          s('TYnapay by Adz', 'slice'),
          s('Uncle Mo’s Shawarma', 'slice')
        ]
      },
      {
        title: 'Food Stations',
        vendors: [
          s('AP Grazing Table', 'loaf', { tagline: 'Artisanal cheese, charcuterie, and gourmet grazing layouts.' }),
          s('Caviar Cake Manila', 'loaf', { tagline: 'Luxury layered caviar cakes with artisanal crackers.' }),
          s('La Petite Fromagerie', 'loaf', { tagline: 'Melted raclette stations and imported European cheeses.' }),
          s('Raclette Manila', 'loaf', { tagline: 'Interactive Swiss raclette scraping bar.' }),
          s('Cocktails Manila', 'slice'),
          s('Ealeatist Kitchen', 'slice'),
          s('La Casa Del Habano', 'slice')
        ]
      },
      {
        title: 'Lechon & Alternatives',
        vendors: [
          s('General’s Lechon', 'bread-basket', {
            logo: '/images/suppliers/bizu.svg', // Will use fallback logo styling
            tagline: 'Award-winning whole roasted lechon with chili garlic, curry, and classic lemongrass.',
            location: 'Metro Manila'
          }),
          s('Charlie’s Pritchon', 'loaf', { tagline: 'Crispy fried lechon wrapped in pita with varied sauces.' }),
          s('Don Bakes Manila (Cochinillo)', 'loaf', { tagline: 'Fork-tender crisp roasted Spanish cochinillo.' }),
          s('Elar’s Catering Services', 'loaf', { tagline: 'Traditional crisp-skin Filipino lechon masters.' }),
          s('Abub’s Cebuana Lechon', 'slice'),
          s('Ellie’s Roasted Calf and Catering Service', 'slice'),
          s('Gatchalian', 'slice'),
          s('Pig Senyor', 'slice'),
          s('Sabroso Lechon', 'slice'),
          s('SSF Kurobuta Lechon', 'slice'),
          s('Ulcing’s', 'slice')
        ]
      },
      {
        title: 'Ice Cream & Gelato Station',
        vendors: [
          s('Manila Creamery', 'bread-basket', {
            logo: '/images/suppliers/manila-creamery.svg',
            tagline: 'Artisanal Italian gelato infused with homegrown Filipino flavors, served from chic carts.',
            location: 'Quezon City & Taguig'
          }),
          s('Aro Gelato', 'loaf', { tagline: 'Silky small-batch gelato cart service.' }),
          s('Caramia', 'loaf', { tagline: 'Beloved classic Italian gelato and cake creations.' }),
          s('Fruits in Ice Cream', 'slice'),
          s('Mang Bert’s Special Ice Cream', 'slice'),
          s('Sorbelato and Soyblessed', 'slice'),
          s('Sumilang Ice Cream', 'slice')
        ]
      },
      {
        title: 'Bar Service & Cocktails',
        vendors: [
          s('The Black Box Mobile Bar', 'loaf', { tagline: 'Sleek matte-black mobile cocktail bars & bespoke signature mixes.' }),
          s('Rue Mobile Bar', 'loaf', { tagline: 'Craft beverage stations and spirited party mixers.' }),
          s('Hikaru Cocktail Bar', 'slice'),
          s('Manila Craft Mixes and Brews', 'slice'),
          s('Night Cap', 'slice'),
          s('Proudly Promdi', 'slice')
        ]
      },
      {
        title: 'Coffee Bar',
        vendors: [
          s('Candid Coffee', 'loaf', { tagline: 'Specialty coffee roastery with interactive pour-over and espresso bars.' }),
          s('Common Folk', 'loaf', { tagline: 'Minimalist aesthetic specialty coffee bar for receptions.' }),
          s('Firefly Coffee', 'loaf', { tagline: 'Artisan espresso and cold brew station setups.' }),
          s('Au N’ Scene Coffee', 'slice'),
          s('Arcana Coffee PH', 'slice'),
          s('Brew + Bakes Café', 'slice'),
          s('Pilgrim’s Coffee', 'slice'),
          s('WKND Coffee', 'slice')
        ]
      },
      {
        title: 'Wines & Spirits',
        vendors: [
          s('Bacchus', 'loaf', { tagline: 'Exclusive fine European wine imports and champagne selections.' }),
          s('Booze Online', 'loaf', { tagline: 'Comprehensive wedding alcohol wholesale & beverage logistics.' }),
          s('Manila Premiere Wines', 'slice')
        ]
      },
      {
        title: 'Bakers & Custom Cakes',
        vendors: [
          s('Honey Glaze Cakes (Aileen Conde)', 'loaf', { tagline: 'Intricate sugar flower masterpieces and regal tiered cakes.' }),
          s('Cakeshop by Sonja', 'loaf', { tagline: 'Whimsical, sumptuous signature dessert spreads & wedding cakes.' }),
          s('Joy Bakes (Joy San Gabriel)', 'loaf', { tagline: 'Timeless fondant craftsmanship and bespoke flavors.' }),
          s('AA’s Cake Design', 'slice'),
          s('Audrey’s Pastries', 'slice'),
          s('Cake by Mannix', 'slice'),
          s('Miss Joyce Bridal Cakes', 'slice')
        ]
      },
      {
        title: 'Crew Meals',
        vendors: [
          s('Packed Gourmet', 'loaf', { tagline: 'Wholesome, hot gourmet packed bento meals for event production crews.' })
        ]
      }
    ]
  },
  {
    id: 'photo-video',
    title: 'Photo & Video',
    icon: 'i-lucide-camera',
    subcategories: [
      {
        title: 'Photographers',
        vendors: [
          s('Nice Print Photography', 'bread-basket', {
            logo: '/images/suppliers/nice-print.svg',
            tagline: 'Leading celebrity & destination wedding photo and video team with decades of iconic captures.',
            location: 'Metro Manila & Global'
          }),
          s('Pat Dy Photography', 'bread-basket', {
            logo: '/images/suppliers/pat-dy.svg',
            tagline: 'Editorial high-fashion bridal portraiture capturing refined emotions and timeless romance.',
            location: 'Makati City'
          }),
          s('Chestknots Studios', 'loaf', { tagline: 'Warm, candid storytelling with timeless visual depth.' }),
          s('Jaja Lifestyle Photography', 'loaf', { tagline: 'Luminous fine-art bridal imagery and heartfelt moments.' }),
          s('Proud Rad', 'loaf', { tagline: 'Modern artistic wedding imagery with striking color and composition.' }),
          s('Toto Villaruel Photography', 'loaf', { tagline: 'Quiet, poetic wedding photojournalism.' }),
          s('Ikigai Studio by Myio', 'slice'),
          s('Myio Okamoto', 'slice'),
          s('Miko Studios', 'slice'),
          s('Nicolai Melacor Photography', 'slice'),
          s('NQ by Metrophoto', 'slice'),
          s('Oak St. Studios', 'slice'),
          s('Photography by Regina Roque', 'slice')
        ]
      },
      {
        title: 'Editorial & Documentary Style Photography',
        vendors: [
          s('Joseph Pascual', 'loaf', { tagline: 'Cinematic documentary coverage full of authenticity and raw energy.' }),
          s('Aya Cabautan', 'loaf', { tagline: 'Soft, evocative editorial portraiture.' }),
          s('Indiego.jpg', 'slice'),
          s('Colin Dancel', 'slice'),
          s('Trasienne', 'slice')
        ]
      },
      {
        title: 'Videographers',
        vendors: [
          s('Bob Nicolas Wedding Film', 'bread-basket', {
            logo: '/images/suppliers/bob-nicolas.svg',
            tagline: 'Cinema-grade storytelling and emotionally charged same-day-edit (SDE) wedding films.',
            location: 'Philippines & Worldwide'
          }),
          s('Treehouse Story', 'loaf', { tagline: 'Indie cinematic wedding films rich in emotional heart and narrative.' }),
          s('Notion In Motion', 'loaf', { tagline: 'High-energy, beautifully graded celebratory wedding films.' }),
          s('Cinema Works', 'slice'),
          s('Ghe Consolacion', 'slice'),
          s('Ian Celis Videography', 'slice'),
          s('Spark Series', 'slice')
        ]
      },
      {
        title: 'Animated Designs & International Shoots',
        vendors: [
          s('Sweet Escape (International Photoshoot)', 'loaf', { tagline: 'On-demand vacation and prenup photographers in 500+ cities.' }),
          s('Always In Motion', 'slice'),
          s('JustBees Digital', 'slice')
        ]
      }
    ]
  },
  {
    id: 'entertainment',
    title: 'Entertainment & Music',
    icon: 'i-lucide-music',
    subcategories: [
      {
        title: 'Choirs',
        vendors: [
          s('Philippine Madrigal Singers', 'bread-basket', {
            logo: '/images/suppliers/mpo.svg',
            tagline: 'UNESCO Artist for Peace and two-time European Grand Prix choral champions.',
            location: 'UP Diliman / Nationwide'
          }),
          s('Ateneo Chamber Singers', 'loaf', { tagline: 'Revered sacred liturgy and classical wedding choral harmony.' }),
          s('Bukas Palad Ministry', 'loaf', { tagline: 'Celebrated liturgical composers behind beloved wedding church hymns.' }),
          s('UP Singing Ambassador', 'loaf', { tagline: 'World-touring choir bringing angelic grandeur to church ceremonies.' }),
          s('Mandaluyong Children’s Choir', 'slice'),
          s('92 AD', 'slice'),
          s('Battig Orchestra', 'slice'),
          s('Hangad', 'slice'),
          s('Kammerchor Manila', 'slice'),
          s('Los Cantantes De Manila', 'slice'),
          s('Novo Concertante Manila', 'slice')
        ]
      },
      {
        title: 'String Ensembles',
        vendors: [
          s('Manila Philharmonic Orchestra', 'bread-basket', {
            logo: '/images/suppliers/mpo.svg',
            tagline: 'The premier orchestra in the Philippines performing majestic ceremony and grand reception symphonies.',
            location: 'Metro Manila'
          }),
          s('Bernie Pasamba Music Consultancy', 'loaf', { tagline: 'Prestige string quartets and versatile wedding ensemble arrangements.' }),
          s('Manila String Machine', 'loaf', { tagline: 'Contemporary pop & film score covers arranged for classical strings.' }),
          s('Da Capo Instrumentalists', 'slice'),
          s('Kadense Strings', 'slice')
        ]
      },
      {
        title: 'Bands (Ceremony & Reception)',
        vendors: [
          s('3rd Avenue', 'loaf', { tagline: 'The Philippines premier wedding band delivering seamless live harmonies.' }),
          s('Soundswell', 'loaf', { tagline: 'Acoustic and full-band arrangements for ceremony and dinner.' }),
          s('Frigora Band', 'slice')
        ]
      },
      {
        title: 'Bands (Reception & After-Party)',
        vendors: [
          s('The Bloomfields', 'loaf', { tagline: 'High-octane retro rock and roll, 60s British invasion, and modern crowd-pleasers.' }),
          s('Power House', 'loaf', { tagline: 'Top-tier party band keeping dancefloors packed till dawn.' }),
          s('AMP Band', 'slice'),
          s('Brass Rosette', 'slice'),
          s('Naughty Panda', 'slice'),
          s('Route 70', 'slice')
        ]
      },
      {
        title: 'DJs & Percussion',
        vendors: [
          s('DJ Kat', 'loaf', { tagline: 'Club-level seamless mixing and open-format wedding party mastery.' }),
          s('Toons Canoy', 'loaf', { tagline: 'Dynamic live beats and crowd-moving party playlists.' }),
          s('Marcus Maguigad (with Percussion)', 'loaf', { tagline: 'Electrifying live percussion alongside dynamic DJ sets.' }),
          s('Christian Tiu', 'slice'),
          s('Jazz Zamora', 'slice'),
          s('Javi Vargas', 'slice'),
          s('Rammy Bitong', 'slice'),
          s('Xavi Panlilio', 'slice'),
          s('Patikeros', 'slice'),
          s('Sunglass Music', 'slice')
        ]
      },
      {
        title: 'MCs & Hosts',
        vendors: [
          s('Eri Neeman', 'bread-basket', {
            logo: '/images/suppliers/mickey-see.svg', // Will use stylized fallback
            tagline: 'The pioneer of interactive, heartfelt wedding reception hosting & the Wedding Games.',
            location: 'Metro Manila & Global'
          }),
          s('Sam YG', 'loaf', { tagline: 'High-energy television personality & charisma-driven master of ceremonies.' }),
          s('RJ Ledesma', 'loaf', { tagline: 'Sophisticated, witty, and engaging hosting for premier society weddings.' }),
          s('Atom Ungson', 'loaf', { tagline: 'Smooth, polished, and articulate bilingual event hosting.' }),
          s('Chuck Araneta', 'slice'),
          s('Edroy Lim', 'slice'),
          s('Gino Quillamore', 'slice'),
          s('JC Alelis', 'slice'),
          s('Kevin Lapeña', 'slice'),
          s('Lia Guerrero', 'slice'),
          s('Marco Borromeo', 'slice'),
          s('Shahein Abraham', 'slice')
        ]
      },
      {
        title: 'Chinese Speaking Hosts',
        vendors: [
          s('Jerome Go', 'loaf', { tagline: 'Expert Mandarin and Hokkien ceremony traditions & modern hosting.' }),
          s('Stan Sy', 'loaf', { tagline: 'Bilingual English-Chinese host with radio charm and cultural flair.' }),
          s('Kimberly Tan', 'slice'),
          s('KV Golamco', 'slice'),
          s('Louie Ngo', 'slice'),
          s('Max Tiu', 'slice'),
          s('Stuart Gan', 'slice')
        ]
      },
      {
        title: 'Dance Instructors',
        vendors: [
          s('East Side Dance Studio', 'loaf', { tagline: 'Bespoke choreography for bride & groom first dance routines.' }),
          s('Anna Rodalin Palma', 'slice'),
          s('Made to Dance', 'slice'),
          s('Reigh Sy', 'slice')
        ]
      },
      {
        title: 'Activities, Arcade & Lawn Games',
        vendors: [
          s('Fun Times Arcade', 'loaf', { tagline: 'Retro claw machines, basketball arcades, and photo entertainment.' }),
          s('Fairy Play (Inflatables & Kid Activities)', 'slice'),
          s('AJ’s Arcade and Rental', 'slice'),
          s('Arcade Games PH', 'slice'),
          s('Play Pixel Rentals', 'slice'),
          s('Fifth House (Lawn Games)', 'slice'),
          s('Happy Party Stations', 'slice')
        ]
      }
    ]
  },
  {
    id: 'styling-production',
    title: 'Styling & Production',
    icon: 'i-lucide-sparkles',
    subcategories: [
      {
        title: 'Event Stylists',
        vendors: [
          s('Teddy Manuel', 'bread-basket', {
            logo: '/images/suppliers/teddy-manuel.svg',
            tagline: 'Visionary floral architecture, ceiling floral installations, and dramatic wedding styling.',
            location: 'San Juan & Destination'
          }),
          s('Robert Blancaflor', 'loaf', { tagline: 'Grand luxury floral productions and majestic ballroom transformations.' }),
          s('Dave Sandoval', 'loaf', { tagline: 'Romantic, lush, and botanical wedding scenery and tablescapes.' }),
          s('Michael Ruiz', 'loaf', { tagline: 'High-concept opulent event design with theatrical lighting aesthetics.' }),
          s('Gideon Hermosa', 'loaf', { tagline: 'World-renowned celebrity event scenography and floral sculptures.' }),
          s('Ginger Events Styling', 'slice'),
          s('Jacq’s Floral', 'slice'),
          s('Il Fiore', 'slice'),
          s('Midle Mañalac', 'slice'),
          s('Spruce Floral Design', 'slice'),
          s('Zenas Pineda', 'slice')
        ]
      },
      {
        title: 'Artistic Florists',
        vendors: [
          s('Paul Jatayna', 'loaf', { tagline: 'Sculptural floral art and avant-garde botanical arrangements.' })
        ]
      },
      {
        title: 'Sounds, Lights & LED Wall',
        vendors: [
          s('Metrotech (LED Wall)', 'loaf', { tagline: 'Curved high-pitch LED screens and concert-grade staging rigs.' }),
          s('Crossmix', 'loaf', { tagline: 'Intelligent beam lighting, crystal line arrays, and crystal-clear audio.' }),
          s('High Impact', 'loaf', { tagline: 'Full festival and wedding production lighting design.' }),
          s('Beat Box', 'slice'),
          s('Forsc Inc.', 'slice'),
          s('Sound Level', 'slice')
        ]
      }
    ]
  },
  {
    id: 'formal-wear',
    title: 'Formal Wear & Couture',
    icon: 'i-lucide-shirt',
    subcategories: [
      {
        title: 'Bridal Couture (Ready to Wear)',
        vendors: [
          s('Francis Libiran Bridal', 'bread-basket', {
            logo: '/images/suppliers/francis-libiran.svg',
            tagline: 'World-class couture gowns marked by intricate Art Deco lines and dramatic silhouettes.',
            location: 'Greenbelt 5, Makati'
          }),
          s('Rosa Clara', 'loaf', { tagline: 'Prestigious Spanish bridal gowns defined by European romance and minimalist elegance.' }),
          s('Pronovias PH', 'loaf', { tagline: 'Haute couture bridal dresses and bespoke Spanish lace veils.' }),
          s('Mi Sueño Bridal Boutique', 'loaf', { tagline: 'Exclusive importer of global bridal fashion houses in Manila.' }),
          s('Ivory and White Bridal', 'slice'),
          s('Studio Ceremonie', 'slice'),
          s('The Bridal Room', 'slice'),
          s('WearEasyPH', 'slice'),
          s('White Label Bridal', 'slice'),
          s('White Lily', 'slice')
        ]
      },
      {
        title: 'Bridal Couture (Made to Order)',
        vendors: [
          s('Michael Leyva', 'loaf', { tagline: 'Royalty-worthy trailing trains, French lace embroidery, and high glamour.' }),
          s('Rajo Laurel', 'loaf', { tagline: 'Artisanal modern Filipino couture balancing tradition and future trends.' }),
          s('Vania Romoff', 'loaf', { tagline: 'Understated femininity, clean bow accents, and flowing sculptural silk.' }),
          s('Patricia Santos Yao', 'loaf', { tagline: 'Sensual, bejeweled gowns crafted with intricate hand-beading.' }),
          s('Boom Sason', 'loaf', { tagline: 'Bold, structured, red-carpet silhouettes designed for the confident bride.' }),
          s('Mak Tumang', 'loaf', { tagline: 'Mythical, hand-embroidered gowns with breathtaking historic detailing.' }),
          s('Banggo Niu', 'slice'),
          s('Bianca Cordero', 'slice'),
          s('Carla Guiao Yuson', 'slice'),
          s('Cecilio Abad Design Team', 'slice'),
          s('Franko Barrio', 'slice'),
          s('Hannah Kong', 'slice'),
          s('Jazel Sy Bridal', 'slice'),
          s('Julianne Syjuco', 'slice'),
          s('Martin Bautista', 'slice'),
          s('Mel Orlina Couture', 'slice'),
          s('Rosenthal Tee', 'slice'),
          s('Sasa Jimenez', 'slice'),
          s('Veluz', 'slice'),
          s('Zia Wycoco', 'slice')
        ]
      },
      {
        title: 'Entourage Couture (Made to Order & RTW)',
        vendors: [
          s('Love C', 'slice'),
          s('Danie Baron Designs', 'slice'),
          s('Decino Dulce', 'slice'),
          s('Micah Lacap', 'slice'),
          s('Mich Araullo-Razon', 'slice'),
          s('Rosalyn Lagdameo', 'slice'),
          s('Karimandon', 'slice'),
          s('Tantease', 'slice'),
          s('WearEasyPH', 'slice'),
          s('Zoo Label', 'slice')
        ]
      },
      {
        title: 'Flower Girl Couture & RTW',
        vendors: [
          s('Hailey&Co (Filipiniana)', 'slice'),
          s('Luxurious Designs', 'slice'),
          s('Fancy Little Designs', 'slice'),
          s('Little Nana’s Closet', 'slice'),
          s('Macy’s Dollhouse', 'slice'),
          s('Posh and Pearls', 'slice'),
          s('Spinkie Wear', 'slice')
        ]
      },
      {
        title: 'Groom’s Tailor (Traditional, Contemporary & Suits)',
        vendors: [
          s('Tiño Suits', 'loaf', { tagline: 'Master bespoke tailoring rooted in the gold standard of Savile Row craft.' }),
          s('Common Suits', 'loaf', { tagline: 'Contemporary menswear tailoring with immaculate Italian wool cuts.' }),
          s('Felipe and Sons', 'loaf', { tagline: 'Bespoke modern barongs and gentleman suits.' }),
          s('Exclusively His', 'loaf', { tagline: 'Decades of reliable bespoke barong and tuxedo tailoring.' }),
          s('Kingsmen', 'slice'),
          s('King Philip', 'slice'),
          s('Kultura (Ready-Made)', 'slice'),
          s('Onesimus', 'slice'),
          s('Tesoro’s', 'slice'),
          s('Ched Studio', 'slice'),
          s('Daryl Maat', 'slice'),
          s('Happy Andrada', 'slice'),
          s('Hubadero Studio', 'slice'),
          s('Lucas Lumban Barong', 'slice'),
          s('Randolf Lab', 'slice'),
          s('RNB Gowns and Barong Lumban', 'slice'),
          s('Sassy Creation PH', 'slice'),
          s('BKS Men', 'slice'),
          s('Cornell’s Custom Tailors', 'slice'),
          s('Fort and Tailler', 'slice'),
          s('JC Buendia', 'slice'),
          s('Made to Measure', 'slice'),
          s('Masanting Sasteria', 'slice'),
          s('Suit It Up Manila', 'slice'),
          s('The Fine Gentlemen', 'slice'),
          s('Ziggy Savella Clothiers', 'slice')
        ]
      },
      {
        title: 'Entourage Tailoring (Barong & Suits)',
        vendors: [
          s('EA Casedo Embroidery (Rey Casedo)', 'slice'),
          s('Lilith De Leon', 'slice'),
          s('Arvox Tailoring by Mang Roger', 'slice'),
          s('Bonnie’s Tailoring Shop, Kamuning', 'slice'),
          s('Edwin Valerio Tailors', 'slice')
        ]
      },
      {
        title: 'Fashion Stylists & Dress Rentals',
        vendors: [
          s('Styled by Jeff Galang', 'loaf', { tagline: 'Celebrity bridal wardrobe styling, veil adjustments, and prenup art direction.' }),
          s('Pam Quiniones/Quotator', 'loaf', { tagline: 'Top-tier fashion editor guidance for the bridal party.' }),
          s('Cath Sobrevega', 'slice'),
          s('Rabbit Hole Creatives', 'slice'),
          s('Sidney Yap', 'slice'),
          s('Vestidos (Prenup Dress Rental)', 'slice'),
          s('Intissimo (Preparation Dress)', 'slice'),
          s('La Rosa Bridal', 'slice'),
          s('La Tercera', 'slice'),
          s('LisseMNL', 'slice')
        ]
      },
      {
        title: 'Made to Order Shoes',
        vendors: [
          s('Jefferson Si', 'loaf', { tagline: 'Bespoke bridal stilettos designed for all-day cushioning and glamour.' }),
          s('Jimmy Choo x Julianne Syjuco', 'loaf', { tagline: 'Iconic crystal-embellished luxury bridal footwear.' }),
          s('Shoepatos Custom Made Shoes by Doreen Odvina', 'slice'),
          s('Waltz Manila', 'slice')
        ]
      }
    ]
  },
  {
    id: 'vanity-hmu',
    title: 'Vanity, Hair & Makeup',
    icon: 'i-lucide-heart',
    subcategories: [
      {
        title: 'Bridal Hair and Make-up',
        vendors: [
          s('Mickey See', 'bread-basket', {
            logo: '/images/suppliers/mickey-see.svg',
            tagline: 'Celebrity beauty guru delivering glowing, flawless natural bridal radiance.',
            location: 'BGC & Metro Manila'
          }),
          s('Denise Ochoa', 'loaf', { tagline: 'Pioneer of fresh-faced, luminous natural bridal makeup artistry.' }),
          s('Jigs Mayuga', 'loaf', { tagline: 'High-definition editorial bridal beauty and makeup mastery.' }),
          s('Anthea Bueno', 'loaf', { tagline: 'Ethereal skin-first bridal looks tailored to camera and lighting.' }),
          s('Chinky Tanjangco', 'slice'),
          s('Ennah Trinidad', 'slice'),
          s('Ish Sison', 'slice'),
          s('John Pagaduan', 'slice'),
          s('Niki Betos', 'slice'),
          s('Niki Medina', 'slice'),
          s('Nikki Duque', 'slice'),
          s('Sari Campos', 'slice')
        ]
      },
      {
        title: 'Grooming of Groom',
        vendors: [
          s('Spoiled Groom', 'loaf', { tagline: 'Onsite barbering, skin prep, and luxury grooming lounges for groomsmen.' })
        ]
      },
      {
        title: 'Entourage HMU',
        vendors: [
          s('Aldrin Jalandoni', 'slice'),
          s('April Ibañez', 'slice'),
          s('Bianca Li-Lomboy', 'slice'),
          s('Chu Salud', 'slice'),
          s('Dane Salcedo (Creations by DGS)', 'slice'),
          s('Daryl Dreyper', 'slice'),
          s('Ervin Braga', 'slice'),
          s('Gex Garcia', 'slice'),
          s('Jill Felix', 'slice'),
          s('Iya Gueco', 'slice'),
          s('Rev Santos', 'slice'),
          s('Rose Lyn Pedayo', 'slice'),
          s('Theresa Padin', 'slice'),
          s('Winshayna Young - Rivera', 'slice')
        ]
      }
    ]
  },
  {
    id: 'prints-stationery',
    title: 'Prints, Stationery & Invitations',
    icon: 'i-lucide-printer',
    subcategories: [
      {
        title: 'Printers & Invitation Makers',
        vendors: [
          s('Print Divas', 'bread-basket', {
            logo: '/images/suppliers/print-divas.svg',
            tagline: 'Bespoke letterpress, metallic foil stamping, handmade deckled paper suites, and wax seals.',
            location: 'Metro Manila'
          }),
          s('WINK Written In Ink', 'loaf', { tagline: 'Modern luxury wedding invitations with creative acrylic and blind deboss touches.' }),
          s('Print and Co.', 'loaf', { tagline: 'Timeless fine paper suites and wedding day-of stationery essentials.' }),
          s('101 Folk Street', 'slice'),
          s('28th of December (invites by Story Machine)', 'slice'),
          s('Kasali.PH', 'slice'),
          s('Fel and Ink', 'slice'),
          s('Ink Scribbler', 'slice'),
          s('Lance Chee', 'slice'),
          s('Neonovelties', 'slice'),
          s('Pat and Fi', 'slice'),
          s('PopGram', 'slice'),
          s('Prinsonalities', 'slice'),
          s('The Story Machine (Illustration)', 'slice'),
          s('Write Impressions Paperie and Press Inc.', 'slice')
        ]
      },
      {
        title: 'Graphic Artists & Calligraphers',
        vendors: [
          s('Fozzy Castro-Dayrit (TheFozzyBook)', 'loaf', { tagline: 'Renowned pointed-pen and modern calligraphy for bespoke wedding suites.' }),
          s('Angela Chua', 'slice'),
          s('Estudio Harana', 'slice'),
          s('Fel and Ink', 'slice'),
          s('Figma by Kara Silva', 'slice'),
          s('Kasali', 'slice'),
          s('Camille Go', 'slice'),
          s('Icka Santos', 'slice'),
          s('Jaycie Tanseco Flores', 'slice'),
          s('Kathryn Puyat', 'slice'),
          s('Patty Py', 'slice')
        ]
      },
      {
        title: 'Embroidery & Specialty Prints',
        vendors: [
          s('By Grace Creatives', 'slice'),
          s('Panyo Embroidered', 'slice'),
          s('Creative Preppers (Personalized Accessories)', 'bread-basket', {
            logo: '/images/suppliers/creative-preppers.svg',
            tagline: 'Hand-embroidered wedding accessories, missalette tags, and custom entourage heirlooms.',
            location: 'Metro Manila'
          }),
          s('Paper Jam (reasonably priced missalettes)', 'slice')
        ]
      }
    ]
  },
  {
    id: 'favors-accessories-registry',
    title: 'Favors, Accessories & Registry',
    icon: 'i-lucide-gift',
    subcategories: [
      {
        title: 'Wedding Essentials & Accessories',
        vendors: [
          s('Creative Preppers', 'bread-basket', {
            logo: '/images/suppliers/creative-preppers.svg',
            tagline: 'Custom heirloom wedding cords, personalized velvet ring boxes, and curated bridal essentials.',
            location: 'Metro Manila'
          }),
          s('Beadybeadz Personalized Wedding Cords', 'slice'),
          s('Wedding Cords and Accessories by Diane Lane', 'slice')
        ]
      },
      {
        title: 'Curated Gift Boxes & Favors',
        vendors: [
          s('Auro (Edible Favors)', 'loaf', { tagline: 'Award-winning single-origin Davao chocolate bars packaged in custom bridal sleeves.' }),
          s('Theo and Filo', 'loaf', { tagline: 'Artisan bean-to-bar chocolates with distinct Filipino heritage flavors.' }),
          s('Neg’s Kitchen PH', 'loaf', { tagline: 'Artisanal cookies and gourmet baked favors.' }),
          s('Cosette and Simon Artisan Gift Design Studio', 'slice'),
          s('Gift Craft MNL', 'slice'),
          s('Made with Love Favors', 'slice'),
          s('The Rustic Craft', 'slice'),
          s('Pamaypay ni Nanay (Fans)', 'slice'),
          s('Casa Juan (Filipino Inspired)', 'slice'),
          s('Liwayway PH', 'slice'),
          s('Pamana – Abel Blankets', 'slice')
        ]
      },
      {
        title: 'Personalized Favors & Interactive Booths',
        vendors: [
          s('360 Cam Spin Video', 'loaf', { tagline: 'Interactive 360-degree rotating slow-motion video platform for guests.' }),
          s('BaiCapture Inc.', 'loaf', { tagline: 'High-speed professional photo booth prints with magnetic backings.' }),
          s('High Caliber', 'slice'),
          s('Stella Personalized Collection', 'slice'),
          s('Thinker Box', 'slice'),
          s('Easy Pics', 'slice'),
          s('Flipbooks by Flipbook Projects', 'slice'),
          s('Paparazzzzi', 'slice'),
          s('Pose and Print', 'slice'),
          s('Team OSS', 'slice'),
          s('Vela (Onsite Favors)', 'slice'),
          s('Sky and Co', 'slice'),
          s('Artisans of Hope (Social Enterprise)', 'slice'),
          s('Ben and Bart (Disposable Cameras)', 'slice')
        ]
      },
      {
        title: 'Live Painting & Artists',
        vendors: [
          s('Michelle Sy', 'loaf', { tagline: 'Live watercolor guest portraits captured in 5-minute sketches on site.' }),
          s('Zoro Jones Art', 'loaf', { tagline: 'Live acrylic on canvas ceremony & first dance live event painting.' }),
          s('Anagrace Bingculado', 'slice'),
          s('Britney Myishia Art', 'slice'),
          s('Caricatures by Krystina Bogus', 'slice'),
          s('Shannah Leigh', 'slice')
        ]
      },
      {
        title: 'Bridal & Gift Registry',
        vendors: [
          s('Rustan’s Weddings and Beyond Bridal Registry', 'loaf', { tagline: 'The gold standard of luxury department store bridal registries.' }),
          s('Crate and Barrel', 'loaf', { tagline: 'Contemporary home furniture, kitchenware, and entertaining essentials registry.' }),
          s('Pottery Barn', 'loaf', { tagline: 'Timeless home decor, heirloom bedding, and living collections.' }),
          s('West Elm', 'loaf', { tagline: 'Mid-century modern design furniture and organic home registry.' }),
          s('Dimensione', 'slice'),
          s('Gourdo’s', 'slice'),
          s('Landmark Department Store', 'slice'),
          s('SM Department Store', 'slice')
        ]
      }
    ]
  }
]
