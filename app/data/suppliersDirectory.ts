export type SupplierTier = 'bread-basket' | 'loaf' | 'slice'

export interface DirectorySupplier {
  id?: string
  _id?: string
  name: string
  tier: SupplierTier
  logo?: string
  tagline?: string
  badge?: string
  highlightOfMonth?: boolean
  website?: string
  location?: string
  categoryName?: string
  categoryId?: string
  subCategory?: string
  contactEmail?: string
  contactNumber?: string
  socialLinks?: Record<string, string>
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
    badgeClass: 'bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-xs',
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

// Helper to construct suppliers with sensible defaults when needed
export function createDirectorySupplier(
  name: string,
  tier: SupplierTier = 'slice',
  options: Partial<DirectorySupplier> = {}
): DirectorySupplier {
  return {
    name,
    tier,
    ...options
  }
}

// Curated suppliers directory categorized across our 8 core wedding planning verticals,
// organized in the signature 3-tier hierarchy: Bread Basket, Loaf, and Slice.
export const SUPPLIERS_DIRECTORY_DATA: SupplierCategory[] = [
  {
    id: 'food-beverage',
    title: 'Food & Beverage',
    icon: 'i-lucide-utensils',
    subcategories: [
      {
        title: 'Catering Companies',
        vendors: [
          createDirectorySupplier('Bizu Catering Studio', 'loaf'),
          createDirectorySupplier('Chef Jessie', 'loaf'),
          createDirectorySupplier('Cibo D’ M Catering', 'loaf'),
          createDirectorySupplier('Florabel', 'loaf'),
          createDirectorySupplier('Via Mare', 'loaf')
        ]
      },
      {
        title: 'Food Carts',
        vendors: [
          createDirectorySupplier('Ay Sauce Street Food', 'loaf'),
          createDirectorySupplier('Berry’s Deli Hotdog Cart', 'loaf'),
          createDirectorySupplier('Lil’ Orbits Mini Donuts', 'loaf'),
          createDirectorySupplier('Lisa’s Bibingka', 'loaf'),
          createDirectorySupplier('Mamang Sorbetero by Crystalyn Sorbetes Ice Cream', 'loaf'),
          createDirectorySupplier('Mang Felix Taho', 'loaf'),
          createDirectorySupplier('Potato Corner', 'loaf'),
          createDirectorySupplier('Soy Bueno Taho', 'loaf'),
          createDirectorySupplier('Tater’s', 'loaf'),
          createDirectorySupplier('Tako Bar MNL', 'loaf'),
          createDirectorySupplier('TYnapay by Adz', 'loaf'),
          createDirectorySupplier('Uncle Mo’s Shawarma', 'loaf')
        ]
      },
      {
        title: 'Food Stations',
        vendors: [
          createDirectorySupplier('AP Grazing Table', 'loaf'),
          createDirectorySupplier('Caviar Cake Manila', 'loaf'),
          createDirectorySupplier('Cocktails Manila', 'loaf'),
          createDirectorySupplier('Ealeatist Kitchen', 'loaf'),
          createDirectorySupplier('La Casa Del Habano', 'loaf'),
          createDirectorySupplier('La Petite Fromagerie', 'loaf'),
          createDirectorySupplier('Raclette Manila', 'loaf')
        ]
      },
      {
        title: 'Lechon & Alternatives',
        vendors: [
          createDirectorySupplier('Charlie’s Pritchon', 'loaf'),
          createDirectorySupplier('Don Bakes Manila (Cochinillo)', 'loaf'),
          createDirectorySupplier('Abub’s Cebuana Lechon', 'loaf'),
          createDirectorySupplier('Elar’s Catering Services', 'loaf'),
          createDirectorySupplier('Ellie’s Roasted Calf and Catering Service', 'loaf'),
          createDirectorySupplier('Gatchalian', 'loaf'),
          createDirectorySupplier('General’s Lechon', 'loaf'),
          createDirectorySupplier('Pig Senyor', 'loaf'),
          createDirectorySupplier('Sabroso Lechon', 'loaf'),
          createDirectorySupplier('SSF Kurobuta Lechon', 'loaf'),
          createDirectorySupplier('Ulcing’s', 'loaf')
        ]
      },
      {
        title: 'Ice Cream & Gelato Station',
        vendors: [
          createDirectorySupplier('Aro Gelato', 'loaf'),
          createDirectorySupplier('Caramia', 'loaf'),
          createDirectorySupplier('Fruits in Ice Cream', 'loaf'),
          createDirectorySupplier('Manila Creamery', 'loaf'),
          createDirectorySupplier('Mang Bert’s Special Ice Cream', 'loaf'),
          createDirectorySupplier('Sorbelato and Soyblessed', 'loaf'),
          createDirectorySupplier('Sumilang Ice Cream', 'loaf')
        ]
      },
      {
        title: 'Bar Service & Cocktails',
        vendors: [
          createDirectorySupplier('Hikaru Cocktail Bar', 'loaf'),
          createDirectorySupplier('Manila Craft Mixes and Brews', 'loaf'),
          createDirectorySupplier('Night Cap', 'loaf'),
          createDirectorySupplier('Proudly Promdi', 'loaf'),
          createDirectorySupplier('Rue Mobile Bar', 'loaf'),
          createDirectorySupplier('The Black Box Mobile Bar', 'loaf')
        ]
      },
      {
        title: 'Coffee Bar',
        vendors: [
          createDirectorySupplier('Au N’ Scene Coffee', 'loaf'),
          createDirectorySupplier('Arcana Coffee PH', 'loaf'),
          createDirectorySupplier('Brew + Bakes Café', 'loaf'),
          createDirectorySupplier('Candid Coffee', 'loaf'),
          createDirectorySupplier('Common Folk', 'loaf'),
          createDirectorySupplier('Firefly Coffee', 'loaf'),
          createDirectorySupplier('Pilgrim’s Coffee', 'loaf'),
          createDirectorySupplier('WKND Coffee', 'loaf')
        ]
      },
      {
        title: 'Wines & Spirits',
        vendors: [
          createDirectorySupplier('Bacchus', 'loaf'),
          createDirectorySupplier('Booze Online', 'loaf'),
          createDirectorySupplier('Manila Premiere Wines', 'loaf')
        ]
      },
      {
        title: 'Bakers & Custom Cakes',
        vendors: [
          createDirectorySupplier('AA’s Cake Design', 'loaf'),
          createDirectorySupplier('Audrey’s Pastries', 'loaf'),
          createDirectorySupplier('Cake by Mannix', 'loaf'),
          createDirectorySupplier('Cakeshop by Sonja', 'loaf'),
          createDirectorySupplier('Honey Glaze Cakes (Aileen Conde)', 'loaf'),
          createDirectorySupplier('Joy Bakes (Joy San Gabriel)', 'loaf'),
          createDirectorySupplier('Miss Joyce Bridal Cakes', 'loaf')
        ]
      },
      {
        title: 'Crew Meals',
        vendors: [
          createDirectorySupplier('Packed Gourmet', 'loaf')
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
          createDirectorySupplier('Chestknots Studios', 'loaf'),
          createDirectorySupplier('Jaja Lifestyle Photography', 'loaf'),
          createDirectorySupplier('Ikigai Studio by Myio', 'loaf'),
          createDirectorySupplier('Myio Okamoto', 'loaf'),
          createDirectorySupplier('Miko Studios', 'loaf'),
          createDirectorySupplier('Nice Print Photography', 'loaf'),
          createDirectorySupplier('Nicolai Melicor Photography', 'loaf'),
          createDirectorySupplier('NQ by Metrophoto', 'loaf'),
          createDirectorySupplier('Oak St. Studios', 'loaf'),
          createDirectorySupplier('Pat Dy Photography', 'loaf'),
          createDirectorySupplier('Photography by Regina Roque', 'loaf'),
          createDirectorySupplier('Proud Rad', 'loaf'),
          createDirectorySupplier('Toto Villaruel Photography', 'loaf')
        ]
      },
      {
        title: 'Editorial & Documentary Style Photography',
        vendors: [
          createDirectorySupplier('Aya Cabautan', 'loaf'),
          createDirectorySupplier('Indiego.jpg', 'loaf'),
          createDirectorySupplier('Colin Dancel', 'loaf'),
          createDirectorySupplier('Joseph Pascual', 'loaf'),
          createDirectorySupplier('Trasienne', 'loaf'),
          createDirectorySupplier('Toto Villaruel Photography', 'loaf')
        ]
      },
      {
        title: 'Videographers',
        vendors: [
          createDirectorySupplier('Bob Nicolas Wedding Film', 'loaf'),
          createDirectorySupplier('Cinema Works', 'loaf'),
          createDirectorySupplier('Ghe Consolacion', 'loaf'),
          createDirectorySupplier('Ian Celis Videography', 'loaf'),
          createDirectorySupplier('Notion In Motion', 'loaf'),
          createDirectorySupplier('Spark Series', 'loaf'),
          createDirectorySupplier('Treehouse Story', 'loaf')
        ]
      },
      {
        title: 'Animated Designs & International Shoots',
        vendors: [
          createDirectorySupplier('Always In Motion', 'loaf'),
          createDirectorySupplier('JustBees Digital', 'loaf'),
          createDirectorySupplier('Sweet Escape', 'loaf')
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
          createDirectorySupplier('Mandaluyong Children’s Choir', 'loaf'),
          createDirectorySupplier('92 AD', 'loaf'),
          createDirectorySupplier('Ateneo Chamber Singers', 'loaf'),
          createDirectorySupplier('Battig Orchestra', 'loaf'),
          createDirectorySupplier('Bukas Palad Ministry', 'loaf'),
          createDirectorySupplier('Hangad', 'loaf'),
          createDirectorySupplier('Kammerchor Manila', 'loaf'),
          createDirectorySupplier('Los Cantantes De Manila', 'loaf'),
          createDirectorySupplier('Novo Concertante Manila', 'loaf'),
          createDirectorySupplier('Philippine Madrigal Singers', 'loaf'),
          createDirectorySupplier('UP Singing Ambassador', 'loaf')
        ]
      },
      {
        title: 'String Ensembles',
        vendors: [
          createDirectorySupplier('Bernie Pasamba Music Consultancy', 'loaf'),
          createDirectorySupplier('Da Capo Instrumentalists', 'loaf'),
          createDirectorySupplier('Kadense Strings', 'loaf'),
          createDirectorySupplier('Manila Philharmonic Orchestra', 'loaf'),
          createDirectorySupplier('Manila String Machine', 'loaf')
        ]
      },
      {
        title: 'Bands (Ceremony & Reception)',
        vendors: [
          createDirectorySupplier('3rd Avenue', 'loaf'),
          createDirectorySupplier('Frigora Band', 'loaf'),
          createDirectorySupplier('Soundswell', 'loaf')
        ]
      },
      {
        title: 'Bands (Reception & After-Party)',
        vendors: [
          createDirectorySupplier('AMP Band', 'loaf'),
          createDirectorySupplier('Brass Rosette', 'loaf'),
          createDirectorySupplier('Naughty Panda', 'loaf'),
          createDirectorySupplier('Power House', 'loaf'),
          createDirectorySupplier('Route 70', 'loaf'),
          createDirectorySupplier('The Bloomfields', 'loaf')
        ]
      },
      {
        title: 'DJs & Percussion',
        vendors: [
          createDirectorySupplier('Christian Tiu', 'loaf'),
          createDirectorySupplier('DJ Kat', 'loaf'),
          createDirectorySupplier('Jazz Zamora', 'loaf'),
          createDirectorySupplier('Javi Vargas', 'loaf'),
          createDirectorySupplier('Rammy Bitong', 'loaf'),
          createDirectorySupplier('Toons Canoy', 'loaf'),
          createDirectorySupplier('Xavi Panlilio', 'loaf'),
          createDirectorySupplier('Marcus Maguigad', 'loaf'),
          createDirectorySupplier('Naughty Panda', 'loaf'),
          createDirectorySupplier('Patikeros', 'loaf'),
          createDirectorySupplier('Sunglass Music', 'loaf')
        ]
      },
      {
        title: 'MCs & Hosts',
        vendors: [
          createDirectorySupplier('Atom Ungson', 'loaf'),
          createDirectorySupplier('Chuck Araneta', 'loaf'),
          createDirectorySupplier('Edroy Lim', 'loaf'),
          createDirectorySupplier('Eri Neeman', 'loaf'),
          createDirectorySupplier('Gino Quillamore', 'loaf'),
          createDirectorySupplier('JC Alelis', 'loaf'),
          createDirectorySupplier('Kevin Lapeña', 'loaf'),
          createDirectorySupplier('Lia Guerrero', 'loaf'),
          createDirectorySupplier('Marco Borromeo', 'loaf'),
          createDirectorySupplier('RJ Ledesma', 'loaf'),
          createDirectorySupplier('Sam YG', 'loaf'),
          createDirectorySupplier('Shahein Abraham', 'loaf')
        ]
      },
      {
        title: 'Chinese Speaking Hosts',
        vendors: [
          createDirectorySupplier('Jerome Go', 'loaf'),
          createDirectorySupplier('Kimberly Tan', 'loaf'),
          createDirectorySupplier('KV Golamco', 'loaf'),
          createDirectorySupplier('Louie Ngo', 'loaf'),
          createDirectorySupplier('Max Tiu', 'loaf'),
          createDirectorySupplier('Stan Sy', 'loaf'),
          createDirectorySupplier('Stuart Gan', 'loaf')
        ]
      },
      {
        title: 'Dance Instructors',
        vendors: [
          createDirectorySupplier('Anna Rodalin Palma', 'loaf'),
          createDirectorySupplier('East Side Dance Studio', 'loaf'),
          createDirectorySupplier('Made to Dance', 'loaf'),
          createDirectorySupplier('Reigh Sy', 'loaf')
        ]
      },
      {
        title: 'Activities, Arcade & Lawn Games',
        vendors: [
          createDirectorySupplier('Fairy Play', 'loaf'),
          createDirectorySupplier('AJ’s Arcade and Rental', 'loaf'),
          createDirectorySupplier('Arcade Games PH', 'loaf'),
          createDirectorySupplier('Fun Times Arcade', 'loaf'),
          createDirectorySupplier('Play Pixel Rentals', 'loaf'),
          createDirectorySupplier('Fifth House', 'loaf'),
          createDirectorySupplier('Happy Party Stations', 'loaf')
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
          createDirectorySupplier('Dave Sandoval', 'loaf'),
          createDirectorySupplier('Ginger Events Styling', 'loaf'),
          createDirectorySupplier('Jacq’s Floral', 'loaf'),
          createDirectorySupplier('Il Fiore', 'loaf'),
          createDirectorySupplier('Michael Ruiz', 'loaf'),
          createDirectorySupplier('Midle Mañalac', 'loaf'),
          createDirectorySupplier('Robert Blancaflor', 'loaf'),
          createDirectorySupplier('Spruce Floral Design', 'loaf'),
          createDirectorySupplier('Teddy Manuel', 'loaf'),
          createDirectorySupplier('Zenas Pineda', 'loaf')
        ]
      },
      {
        title: 'Artistic Florists',
        vendors: [
          createDirectorySupplier('Paul Jatayna', 'loaf')
        ]
      },
      {
        title: 'Sounds, Lights & LED Wall',
        vendors: [
          createDirectorySupplier('Beat Box', 'loaf'),
          createDirectorySupplier('Crossmix', 'loaf'),
          createDirectorySupplier('Forsc Inc.', 'loaf'),
          createDirectorySupplier('High Impact', 'loaf'),
          createDirectorySupplier('Sound Level', 'loaf'),
          createDirectorySupplier('Metrotech', 'loaf')
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
          createDirectorySupplier('Francis Libiran Bridal', 'loaf'),
          createDirectorySupplier('Ivory and White Bridal', 'loaf'),
          createDirectorySupplier('Mi Sueño Bridal Boutique', 'loaf'),
          createDirectorySupplier('Rosa Clara', 'loaf'),
          createDirectorySupplier('Pronovias PH', 'loaf'),
          createDirectorySupplier('Studio Ceremonie', 'loaf'),
          createDirectorySupplier('The Bridal Room', 'loaf'),
          createDirectorySupplier('WearEasyPH', 'loaf'),
          createDirectorySupplier('White Label Bridal', 'loaf'),
          createDirectorySupplier('White Lily', 'loaf')
        ]
      },
      {
        title: 'Bridal Couture (Made to Order)',
        vendors: [
          createDirectorySupplier('Banggo Niu', 'loaf'),
          createDirectorySupplier('Bianca Cordero', 'loaf'),
          createDirectorySupplier('Boom Sason', 'loaf'),
          createDirectorySupplier('Carla Guiao Yuson', 'loaf'),
          createDirectorySupplier('Cecilio Abad Design Team', 'loaf'),
          createDirectorySupplier('Francis Libiran Bridal', 'loaf'),
          createDirectorySupplier('Franko Barrio', 'loaf'),
          createDirectorySupplier('Hannah Kong', 'loaf'),
          createDirectorySupplier('Jazel Sy Bridal', 'loaf'),
          createDirectorySupplier('Julianne Syjuco', 'loaf'),
          createDirectorySupplier('Mak Tumang', 'loaf'),
          createDirectorySupplier('Martin Bautista', 'loaf'),
          createDirectorySupplier('Mel Orlina Couture', 'loaf'),
          createDirectorySupplier('Michael Leyva', 'loaf'),
          createDirectorySupplier('Patricia Santos Yao', 'loaf'),
          createDirectorySupplier('Rajo Laurel', 'loaf'),
          createDirectorySupplier('Rosenthal Tee', 'loaf'),
          createDirectorySupplier('Sasa Jimenez', 'loaf'),
          createDirectorySupplier('Vania Romoff', 'loaf'),
          createDirectorySupplier('Veluz', 'loaf'),
          createDirectorySupplier('Zia Wycoco', 'loaf')
        ]
      },
      {
        title: 'Entourage Couture (Made to Order & RTW)',
        vendors: [
          createDirectorySupplier('Danie Baron Designs', 'loaf'),
          createDirectorySupplier('Decino Dulce', 'loaf'),
          createDirectorySupplier('Love C', 'loaf'),
          createDirectorySupplier('Micah Lacap', 'loaf'),
          createDirectorySupplier('Mich Araullo-Razon', 'loaf'),
          createDirectorySupplier('Rosalyn Lagdameo', 'loaf'),
          createDirectorySupplier('Karimandon', 'loaf'),
          createDirectorySupplier('Tantease', 'loaf'),
          createDirectorySupplier('WearEasyPH', 'loaf'),
          createDirectorySupplier('Zoo Label', 'loaf')
        ]
      },
      {
        title: 'Flower Girl Couture & RTW',
        vendors: [
          createDirectorySupplier('Hailey&Co (Filipiniana)', 'loaf'),
          createDirectorySupplier('Luxurious Designs', 'loaf'),
          createDirectorySupplier('Fancy Little Designs', 'loaf'),
          createDirectorySupplier('Little Nana’s Closet', 'loaf'),
          createDirectorySupplier('Love C', 'loaf'),
          createDirectorySupplier('Macy’s Dollhouse', 'loaf'),
          createDirectorySupplier('Posh and Pearls', 'loaf'),
          createDirectorySupplier('Spinkie Wear', 'loaf')
        ]
      },
      {
        title: 'Groom’s Tailor (Traditional, Contemporary & Suits)',
        vendors: [
          createDirectorySupplier('Exclusively His', 'loaf'),
          createDirectorySupplier('Kingsmen', 'loaf'),
          createDirectorySupplier('King Philip', 'loaf'),
          createDirectorySupplier('Kultura (Ready-Made)', 'loaf'),
          createDirectorySupplier('Onesimus', 'loaf'),
          createDirectorySupplier('Tesoro’s', 'loaf'),
          createDirectorySupplier('Ched Studio', 'loaf'),
          createDirectorySupplier('Daryl Maat', 'loaf'),
          createDirectorySupplier('Happy Andrada', 'loaf'),
          createDirectorySupplier('Hubadero Studio', 'loaf'),
          createDirectorySupplier('Lucas Lumban Barong', 'loaf'),
          createDirectorySupplier('Randolf Lab', 'loaf'),
          createDirectorySupplier('RNB Gowns and Barong Lumban', 'loaf'),
          createDirectorySupplier('Sassy Creation PH', 'loaf'),
          createDirectorySupplier('BKS Men', 'loaf'),
          createDirectorySupplier('Cornell’s Custom Tailors', 'loaf'),
          createDirectorySupplier('Common Suits', 'loaf'),
          createDirectorySupplier('Exclusively His Tailoring', 'loaf'),
          createDirectorySupplier('Felipe and Sons', 'loaf'),
          createDirectorySupplier('Fort and Tailler', 'loaf'),
          createDirectorySupplier('JC Buendia', 'loaf'),
          createDirectorySupplier('Made to Measure', 'loaf'),
          createDirectorySupplier('Masanting Sasteria', 'loaf'),
          createDirectorySupplier('Suit It Up Manila', 'loaf'),
          createDirectorySupplier('The Fine Gentlemen', 'loaf'),
          createDirectorySupplier('Tiño Suits', 'loaf'),
          createDirectorySupplier('Ziggy Savella Clothiers', 'loaf')
        ]
      },
      {
        title: 'Entourage Tailoring (Barong & Suits)',
        vendors: [
          createDirectorySupplier('EA Casedo Embroidery (Rey Casedo)', 'loaf'),
          createDirectorySupplier('Lilith De Leon', 'loaf'),
          createDirectorySupplier('Arvox Tailoring by Mang Roger', 'loaf'),
          createDirectorySupplier('Bonnie’s Tailoring Shop, Kamuning', 'loaf'),
          createDirectorySupplier('Edwin Valerio Tailors', 'loaf')
        ]
      },
      {
        title: 'Fashion Stylists & Dress Rentals',
        vendors: [
          createDirectorySupplier('Cath Sobrevega', 'loaf'),
          createDirectorySupplier('Pam Quiniones/Quotator', 'loaf'),
          createDirectorySupplier('Rabbit Hole Creatives', 'loaf'),
          createDirectorySupplier('Sidney Yap', 'loaf'),
          createDirectorySupplier('Styled by Jeff Galang', 'loaf'),
          createDirectorySupplier('Vestidos', 'loaf'),
          createDirectorySupplier('Intissimo', 'loaf'),
          createDirectorySupplier('La Rosa Bridal', 'loaf'),
          createDirectorySupplier('La Tercera', 'loaf'),
          createDirectorySupplier('LisseMNL', 'loaf')
        ]
      },
      {
        title: 'Made to Order Shoes',
        vendors: [
          createDirectorySupplier('Jefferson Si', 'loaf'),
          createDirectorySupplier('Jimmy Choo x Julianne Syjuco', 'loaf'),
          createDirectorySupplier('Shoepatos Custom Made Shoes by Doreen Odvina', 'loaf'),
          createDirectorySupplier('Waltz Manila', 'loaf')
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
          createDirectorySupplier('Anthea Bueno', 'loaf'),
          createDirectorySupplier('Chinky Tanjangco', 'loaf'),
          createDirectorySupplier('Denise Ochoa', 'loaf'),
          createDirectorySupplier('Ennah Trinidad', 'loaf'),
          createDirectorySupplier('Ish Sison', 'loaf'),
          createDirectorySupplier('Jigs Mayuga', 'loaf'),
          createDirectorySupplier('John Pagaduan', 'loaf'),
          createDirectorySupplier('Mickey See', 'loaf'),
          createDirectorySupplier('Niki Betos', 'loaf'),
          createDirectorySupplier('Niki Medina', 'loaf'),
          createDirectorySupplier('Nikki Duque', 'loaf'),
          createDirectorySupplier('Sari Campos', 'loaf')
        ]
      },
      {
        title: 'Grooming of Groom',
        vendors: [
          createDirectorySupplier('Spoiled Groom', 'loaf')
        ]
      },
      {
        title: 'Entourage HMU',
        vendors: [
          createDirectorySupplier('Aldrin Jalandoni', 'loaf'),
          createDirectorySupplier('April Ibañez', 'loaf'),
          createDirectorySupplier('Bianca Li-Lomboy', 'loaf'),
          createDirectorySupplier('Chu Salud', 'loaf'),
          createDirectorySupplier('Dane Salcedo (Creations by DGS)', 'loaf'),
          createDirectorySupplier('Daryl Dreyper', 'loaf'),
          createDirectorySupplier('Ervin Braga', 'loaf'),
          createDirectorySupplier('Gex Garcia', 'loaf'),
          createDirectorySupplier('Jill Felix', 'loaf'),
          createDirectorySupplier('Iya Gueco', 'loaf'),
          createDirectorySupplier('Rev Santos', 'loaf'),
          createDirectorySupplier('Rose Lyn Pedayo', 'loaf'),
          createDirectorySupplier('Theresa Padin', 'loaf'),
          createDirectorySupplier('Winshayna Young - Rivera', 'loaf')
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
          createDirectorySupplier('101 Folk Street', 'loaf'),
          createDirectorySupplier('28th of December (invites by Story Machine)', 'loaf'),
          createDirectorySupplier('Kasali.PH', 'loaf'),
          createDirectorySupplier('Fel and Ink', 'loaf'),
          createDirectorySupplier('Ink Scribbler', 'loaf'),
          createDirectorySupplier('Lance Chee', 'loaf'),
          createDirectorySupplier('Neonovelties', 'loaf'),
          createDirectorySupplier('Pat and Fi', 'loaf'),
          createDirectorySupplier('PopGram', 'loaf'),
          createDirectorySupplier('Print and Co.', 'loaf'),
          createDirectorySupplier('Print Divas', 'loaf'),
          createDirectorySupplier('Prinsonalities', 'loaf'),
          createDirectorySupplier('The Story Machine (Illustration)', 'loaf'),
          createDirectorySupplier('WINK Written In Ink', 'loaf'),
          createDirectorySupplier('Write Impressions Paperie and Press Inc.', 'loaf')
        ]
      },
      {
        title: 'Graphic Artists & Calligraphers',
        vendors: [
          createDirectorySupplier('Angela Chua', 'loaf'),
          createDirectorySupplier('Estudio Harana', 'loaf'),
          createDirectorySupplier('Fel and Ink', 'loaf'),
          createDirectorySupplier('Figma by Kara Silva', 'loaf'),
          createDirectorySupplier('Kasali', 'loaf'),
          createDirectorySupplier('Camille Go', 'loaf'),
          createDirectorySupplier('Fozzy Castro-Dayrit (TheFozzyBook)', 'loaf'),
          createDirectorySupplier('Icka Santos', 'loaf'),
          createDirectorySupplier('Jaycie Tanseco Flores', 'loaf'),
          createDirectorySupplier('Kathryn Puyat', 'loaf'),
          createDirectorySupplier('Patty Py', 'loaf')
        ]
      },
      {
        title: 'Embroidery & Specialty Prints',
        vendors: [
          createDirectorySupplier('By Grace Creatives', 'loaf'),
          createDirectorySupplier('Panyo Embroidered', 'loaf'),
          createDirectorySupplier('Creative Preppers (Personalized Accessories)', 'loaf'),
          createDirectorySupplier('Paper Jam (reasonably priced missalettes)', 'loaf')
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
          createDirectorySupplier('Beadybeadz Personalized Wedding Cords', 'loaf'),
          createDirectorySupplier('Creative Preppers', 'loaf'),
          createDirectorySupplier('Wedding Cords and Accessories by Diane Lane', 'loaf')
        ]
      },
      {
        title: 'Curated Gift Boxes & Favors',
        vendors: [
          createDirectorySupplier('Cosette and Simon Artisan Gift Design Studio', 'loaf'),
          createDirectorySupplier('Gift Craft MNL', 'loaf'),
          createDirectorySupplier('Made with Love Favors', 'loaf'),
          createDirectorySupplier('The Rustic Craft', 'loaf'),
          createDirectorySupplier('Auro', 'loaf'),
          createDirectorySupplier('Neg’5 Kitchen PH', 'loaf'),
          createDirectorySupplier('Theo and Filo', 'loaf'),
          createDirectorySupplier('Pamaypay ni Nanay', 'loaf'),
          createDirectorySupplier('Casa Juan', 'loaf'),
          createDirectorySupplier('Liwayway PH', 'loaf'),
          createDirectorySupplier('Pamana – Abel Blankets', 'loaf'),
          createDirectorySupplier('Vela', 'loaf'),
          createDirectorySupplier('Sky and Co', 'loaf'),
          createDirectorySupplier('Artisans of Hope', 'loaf')
        ]
      },
      {
        title: 'Personalized Favors & Interactive Booths',
        vendors: [
          createDirectorySupplier('360 Cam Spin Video', 'loaf'),
          createDirectorySupplier('BaiCapture Inc.', 'loaf'),
          createDirectorySupplier('Easy Pics', 'loaf'),
          createDirectorySupplier('Flipbooks by Flipbook Projects', 'loaf'),
          createDirectorySupplier('Paparazzzzi', 'loaf'),
          createDirectorySupplier('Pose and Print', 'loaf'),
          createDirectorySupplier('Team OSS', 'loaf'),
          createDirectorySupplier('Creative Preppers', 'loaf'),
          createDirectorySupplier('High Caliber', 'loaf'),
          createDirectorySupplier('Stella Personalized Collection', 'loaf'),
          createDirectorySupplier('Thinker Box', 'loaf'),
          createDirectorySupplier('Ben and Bart', 'loaf')
        ]
      },
      {
        title: 'Live Painting & Artists',
        vendors: [
          createDirectorySupplier('Anagrace Bingculado', 'loaf'),
          createDirectorySupplier('Britney Myishia Art', 'loaf'),
          createDirectorySupplier('Caricatures by Krystina Bogus', 'loaf'),
          createDirectorySupplier('Michelle Sy', 'loaf'),
          createDirectorySupplier('Shannah Leigh', 'loaf'),
          createDirectorySupplier('Zoro Jones Art', 'loaf')
        ]
      },
      {
        title: 'Bridal & Gift Registry',
        vendors: [
          createDirectorySupplier('Crate and Barrel', 'loaf'),
          createDirectorySupplier('Dimensione', 'loaf'),
          createDirectorySupplier('Gourdo’s', 'loaf'),
          createDirectorySupplier('Landmark Department Store', 'loaf'),
          createDirectorySupplier('Pottery Barn', 'loaf'),
          createDirectorySupplier('Rustan’s Weddings and Beyond Bridal Registry', 'loaf'),
          createDirectorySupplier('SM Department Store', 'loaf'),
          createDirectorySupplier('West Elm', 'loaf')
        ]
      }
    ]
  }
]
