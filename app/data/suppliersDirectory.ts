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

// Supplier categories and subcategories taxonomy with empty placeholder suppliers, ready for backend data transmission.
export const SUPPLIERS_DIRECTORY_DATA: SupplierCategory[] = [
  {
    id: 'food-beverage',
    title: 'Food & Beverage',
    icon: 'i-lucide-utensils',
    subcategories: [
      {
        title: 'Catering Companies',
        vendors: []
      },
      {
        title: 'Food Carts',
        vendors: []
      },
      {
        title: 'Food Stations',
        vendors: []
      },
      {
        title: 'Lechon & Alternatives',
        vendors: []
      },
      {
        title: 'Ice Cream & Gelato Station',
        vendors: []
      },
      {
        title: 'Bar Service & Cocktails',
        vendors: []
      },
      {
        title: 'Coffee Bar',
        vendors: []
      },
      {
        title: 'Wines & Spirits',
        vendors: []
      },
      {
        title: 'Bakers & Custom Cakes',
        vendors: []
      },
      {
        title: 'Crew Meals',
        vendors: []
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
        vendors: []
      },
      {
        title: 'Editorial & Documentary Style Photography',
        vendors: []
      },
      {
        title: 'Videographers',
        vendors: []
      },
      {
        title: 'Animated Designs & International Shoots',
        vendors: []
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
        vendors: []
      },
      {
        title: 'String Ensembles',
        vendors: []
      },
      {
        title: 'Bands (Ceremony & Reception)',
        vendors: []
      },
      {
        title: 'Bands (Reception & After-Party)',
        vendors: []
      },
      {
        title: 'DJs & Percussion',
        vendors: []
      },
      {
        title: 'MCs & Hosts',
        vendors: []
      },
      {
        title: 'Chinese Speaking Hosts',
        vendors: []
      },
      {
        title: 'Dance Instructors',
        vendors: []
      },
      {
        title: 'Activities, Arcade & Lawn Games',
        vendors: []
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
        vendors: []
      },
      {
        title: 'Artistic Florists',
        vendors: []
      },
      {
        title: 'Sounds, Lights & LED Wall',
        vendors: []
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
        vendors: []
      },
      {
        title: 'Bridal Couture (Made to Order)',
        vendors: []
      },
      {
        title: 'Entourage Couture (Made to Order & RTW)',
        vendors: []
      },
      {
        title: 'Flower Girl Couture & RTW',
        vendors: []
      },
      {
        title: 'Groom’s Tailor (Traditional, Contemporary & Suits)',
        vendors: []
      },
      {
        title: 'Entourage Tailoring (Barong & Suits)',
        vendors: []
      },
      {
        title: 'Fashion Stylists & Dress Rentals',
        vendors: []
      },
      {
        title: 'Made to Order Shoes',
        vendors: []
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
        vendors: []
      },
      {
        title: 'Grooming of Groom',
        vendors: []
      },
      {
        title: 'Entourage HMU',
        vendors: []
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
        vendors: []
      },
      {
        title: 'Graphic Artists & Calligraphers',
        vendors: []
      },
      {
        title: 'Embroidery & Specialty Prints',
        vendors: []
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
          createDirectorySupplier('Creative Preppers', 'bread-basket', {
            logo: '/images/suppliers/creative-preppers.webp',
            tagline: 'Custom heirloom wedding cords, personalized velvet ring boxes, and curated bridal essentials.',
            location: 'Metro Manila',
            socialLinks: {
              facebook: 'https://www.facebook.com/CreativePreppers'
            }
          })
        ]
      },
      {
        title: 'Curated Gift Boxes & Favors',
        vendors: []
      },
      {
        title: 'Personalized Favors & Interactive Booths',
        vendors: []
      },
      {
        title: 'Live Painting & Artists',
        vendors: []
      },
      {
        title: 'Bridal & Gift Registry',
        vendors: []
      }
    ]
  }
]
