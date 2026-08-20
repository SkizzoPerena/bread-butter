<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({
  layout: 'landing-navbar',
})

useHead({
  title: 'Our Suppliers - Bread + Butter',
  meta: [
    {
      name: 'description',
      content: 'A comprehensive curated directory of trusted wedding suppliers, catering companies, venues, planners, photographers, stylists, and bridal partners.'
    }
  ]
})

interface VendorSubCategory {
  title: string
  vendors: string[]
}

interface VendorCategory {
  id: string
  title: string
  icon: string
  subcategories: VendorSubCategory[]
}

const searchQuery = ref('')
const selectedCategoryId = ref<string>('all')

const categories: VendorCategory[] = [
  {
    id: 'food-beverage',
    title: 'Food & Beverage',
    icon: 'i-lucide-utensils',
    subcategories: [
      {
        title: 'Catering Companies',
        vendors: ['Bizu Catering Studio', 'Chef Jessie', 'Cibo D’ M Catering', 'Florabel', 'Via Mare']
      },
      {
        title: 'Food Carts',
        vendors: [
          'Ay Sauce Street Food',
          'Berry’s Deli Hotdog Cart',
          'Lil’ Orbits Mini Donuts',
          'Lisa’s Bibingka',
          'Mamang Sorbetero by Crystalyn Sorbetes Ice Cream',
          'Mang Felix Taho',
          'Potato Corner',
          'Soy Bueno Taho',
          'Tater’s',
          'Tako Bar MNL',
          'TYnapay by Adz',
          'Uncle Mo’s Shawarma'
        ]
      },
      {
        title: 'Food Stations',
        vendors: [
          'AP Grazing Table',
          'Caviar Cake Manila',
          'Cocktails Manila',
          'Ealeatist Kitchen',
          'La Casa Del Habano',
          'La Petite Fromagerie',
          'Raclette Manila'
        ]
      },
      {
        title: 'Lechon & Alternatives',
        vendors: [
          'Charlie’s Pritchon',
          'Don Bakes Manila (Cochinillo)',
          'Abub’s Cebuana Lechon',
          'Elar’s Catering Services',
          'Ellie’s Roasted Calf and Catering Service',
          'Gatchalian',
          'General’s Lechon',
          'Pig Senyor',
          'Sabroso Lechon',
          'SSF Kurobuta Lechon',
          'Ulcing’s'
        ]
      },
      {
        title: 'Ice Cream & Gelato Station',
        vendors: [
          'Aro Gelato',
          'Caramia',
          'Fruits in Ice Cream',
          'Manila Creamery',
          'Mang Bert’s Special Ice Cream',
          'Sorbelato and Soyblessed',
          'Sumilang Ice Cream'
        ]
      },
      {
        title: 'Bar Service & Cocktails',
        vendors: [
          'Hikaru Cocktail Bar',
          'Manila Craft Mixes and Brews',
          'Night Cap',
          'Proudly Promdi',
          'Rue Mobile Bar',
          'The Black Box Mobile Bar'
        ]
      },
      {
        title: 'Coffee Bar',
        vendors: [
          'Au N’ Scene Coffee',
          'Arcana Coffee PH',
          'Brew + Bakes Café',
          'Candid Coffee',
          'Common Folk',
          'Firefly Coffee',
          'Pilgrim’s Coffee',
          'WKND Coffee'
        ]
      },
      {
        title: 'Wines & Spirits',
        vendors: ['Bacchus', 'Booze Online', 'Manila Premiere Wines']
      },
      {
        title: 'Bakers & Custom Cakes',
        vendors: [
          'AA’s Cake Design',
          'Audrey’s Pastries',
          'Cake by Mannix',
          'Cakeshop by Sonja',
          'Honey Glaze Cakes (Aileen Conde)',
          'Joy Bakes (Joy San Gabriel)',
          'Miss Joyce Bridal Cakes'
        ]
      },
      {
        title: 'Crew Meals',
        vendors: ['Packed Gourmet']
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
          'Chestknots Studios',
          'Jaja Lifestyle Photography',
          'Ikigai Studio by Myio',
          'Myio Okamoto',
          'Miko Studios',
          'Nice Print Photography',
          'Nicolai Melacor Photography',
          'NQ by Metrophoto',
          'Oak St. Studios',
          'Pat Dy Photography',
          'Photography by Regina Roque',
          'Proud Rad',
          'Toto Villaruel Photography'
        ]
      },
      {
        title: 'Editorial & Documentary Style Photography',
        vendors: [
          'Aya Cabautan',
          'Indiego.jpg',
          'Colin Dancel',
          'Joseph Pascual',
          'Trasienne',
          'Toto Villaruel Photography'
        ]
      },
      {
        title: 'Videographers',
        vendors: [
          'Bob Nicolas Wedding Film',
          'Cinema Works',
          'Ghe Consolacion',
          'Ian Celis Videography',
          'Notion In Motion',
          'Spark Series',
          'Treehouse Story'
        ]
      },
      {
        title: 'Animated Designs & International Shoots',
        vendors: ['Always In Motion', 'JustBees Digital', 'Sweet Escape (International Photoshoot)']
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
          'Mandaluyong Children’s Choir',
          '92 AD',
          'Ateneo Chamber Singers',
          'Battig Orchestra',
          'Bukas Palad Ministry',
          'Hangad',
          'Kammerchor Manila',
          'Los Cantantes De Manila',
          'Novo Concertante Manila',
          'Philippine Madrigal Singers',
          'UP Singing Ambassador'
        ]
      },
      {
        title: 'String Ensembles',
        vendors: [
          'Bernie Pasamba Music Consultancy',
          'Da Capo Instrumentalists',
          'Kadense Strings',
          'Manila Philharmonic Orchestra',
          'Manila String Machine'
        ]
      },
      {
        title: 'Bands (Ceremony & Reception)',
        vendors: ['3rd Avenue', 'Frigora Band', 'Soundswell']
      },
      {
        title: 'Bands (Reception & After-Party)',
        vendors: ['AMP Band', 'Brass Rosette', 'Naughty Panda', 'Power House', 'Route 70', 'The Bloomfields']
      },
      {
        title: 'DJs & Percussion',
        vendors: [
          'Christian Tiu',
          'DJ Kat',
          'Jazz Zamora',
          'Javi Vargas',
          'Rammy Bitong',
          'Toons Canoy',
          'Xavi Panlilio',
          'Marcus Maguigad (with Percussion)',
          'Naughty Panda',
          'Patikeros',
          'Sunglass Music'
        ]
      },
      {
        title: 'MCs & Hosts',
        vendors: [
          'Atom Ungson',
          'Chuck Araneta',
          'Edroy Lim',
          'Eri Neeman',
          'Gino Quillamore',
          'JC Alelis',
          'Kevin Lapeña',
          'Lia Guerrero',
          'Marco Borromeo',
          'RJ Ledesma',
          'Sam YG',
          'Shahein Abraham'
        ]
      },
      {
        title: 'Chinese Speaking Hosts',
        vendors: ['Jerome Go', 'Kimberly Tan', 'KV Golamco', 'Louie Ngo', 'Max Tiu', 'Stan Sy', 'Stuart Gan']
      },
      {
        title: 'Dance Instructors',
        vendors: ['Anna Rodalin Palma', 'East Side Dance Studio', 'Made to Dance', 'Reigh Sy']
      },
      {
        title: 'Activities, Arcade & Lawn Games',
        vendors: [
          'Fairy Play (Inflatables & Kid Activities)',
          'AJ’s Arcade and Rental',
          'Arcade Games PH',
          'Fun Times Arcade',
          'Play Pixel Rentals',
          'Fifth House (Lawn Games)',
          'Happy Party Stations'
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
          'Dave Sandoval',
          'Ginger Events Styling',
          'Jacq’s Floral',
          'Il Fiore',
          'Michael Ruiz',
          'Midle Mañalac',
          'Robert Blancaflor',
          'Spruce Floral Design',
          'Teddy Manuel',
          'Zenas Pineda'
        ]
      },
      {
        title: 'Artistic Florists',
        vendors: ['Paul Jatayna']
      },
      {
        title: 'Sounds, Lights & LED Wall',
        vendors: ['Beat Box', 'Crossmix', 'Forsc Inc.', 'High Impact', 'Sound Level', 'Metrotech (LED Wall)']
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
          'Francis Libiran Bridal',
          'Ivory and White Bridal',
          'Mi Sueño Bridal Boutique',
          'Rosa Clara',
          'Pronovias PH',
          'Studio Ceremonie',
          'The Bridal Room',
          'WearEasyPH',
          'White Label Bridal',
          'White Lily'
        ]
      },
      {
        title: 'Bridal Couture (Made to Order)',
        vendors: [
          'Banggo Niu',
          'Bianca Cordero',
          'Boom Sason',
          'Carla Guiao Yuson',
          'Cecilio Abad Design Team',
          'Francis Libiran Bridal',
          'Franko Barrio',
          'Hannah Kong',
          'Jazel Sy Bridal',
          'Julianne Syjuco',
          'Mak Tumang',
          'Martin Bautista',
          'Mel Orlina Couture',
          'Michael Leyva',
          'Patricia Santos Yao',
          'Rajo Laurel',
          'Rosenthal Tee',
          'Sasa Jimenez',
          'Vania Romoff',
          'Veluz',
          'Zia Wycoco'
        ]
      },
      {
        title: 'Entourage Couture (Made to Order & RTW)',
        vendors: [
          'Danie Baron Designs',
          'Decino Dulce',
          'Love C',
          'Micah Lacap',
          'Mich Araullo-Razon',
          'Rosalyn Lagdameo',
          'Karimandon',
          'Tantease',
          'WearEasyPH',
          'Zoo Label'
        ]
      },
      {
        title: 'Flower Girl Couture & RTW',
        vendors: [
          'Hailey&Co (Filipiniana)',
          'Luxurious Designs',
          'Fancy Little Designs',
          'Little Nana’s Closet',
          'Love C',
          'Macy’s Dollhouse',
          'Posh and Pearls',
          'Spinkie Wear'
        ]
      },
      {
        title: 'Groom’s Tailor (Traditional, Contemporary & Suits)',
        vendors: [
          'Exclusively His',
          'Kingsmen',
          'King Philip',
          'Kultura (Ready-Made)',
          'Onesimus',
          'Tesoro’s',
          'Ched Studio',
          'Daryl Maat',
          'Happy Andrada',
          'Hubadero Studio',
          'Lucas Lumban Barong',
          'Randolf Lab',
          'RNB Gowns and Barong Lumban',
          'Sassy Creation PH',
          'BKS Men',
          'Cornell’s Custom Tailors',
          'Common Suits',
          'Exclusively His Tailoring',
          'Felipe and Sons',
          'Fort and Tailler',
          'JC Buendia',
          'Made to Measure',
          'Masanting Sasteria',
          'Suit It Up Manila',
          'The Fine Gentlemen',
          'Tiño Suits',
          'Ziggy Savella Clothiers'
        ]
      },
      {
        title: 'Entourage Tailoring (Barong & Suits)',
        vendors: [
          'EA Casedo Embroidery (Rey Casedo)',
          'Lilith De Leon',
          'Arvox Tailoring by Mang Roger',
          'Bonnie’s Tailoring Shop, Kamuning',
          'Edwin Valerio Tailors'
        ]
      },
      {
        title: 'Fashion Stylists & Dress Rentals',
        vendors: [
          'Cath Sobrevega',
          'Pam Quiniones/Quotator',
          'Rabbit Hole Creatives',
          'Sidney Yap',
          'Styled by Jeff Galang',
          'Vestidos (Prenup Dress Rental)',
          'Intissimo (Preparation Dress)',
          'La Rosa Bridal',
          'La Tercera',
          'LisseMNL'
        ]
      },
      {
        title: 'Made to Order Shoes',
        vendors: [
          'Jefferson Si',
          'Jimmy Choo x Julianne Syjuco',
          'Shoepatos Custom Made Shoes by Doreen Odvina',
          'Waltz Manila'
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
          'Anthea Bueno',
          'Chinky Tanjangco',
          'Denise Ochoa',
          'Ennah Trinidad',
          'Ish Sison',
          'Jigs Mayuga',
          'John Pagaduan',
          'Mickey See',
          'Niki Betos',
          'Niki Medina',
          'Nikki Duque',
          'Sari Campos'
        ]
      },
      {
        title: 'Grooming of Groom',
        vendors: ['Spoiled Groom']
      },
      {
        title: 'Entourage HMU',
        vendors: [
          'Aldrin Jalandoni',
          'April Ibañez',
          'Bianca Li-Lomboy',
          'Chu Salud',
          'Dane Salcedo (Creations by DGS)',
          'Daryl Dreyper',
          'Ervin Braga',
          'Gex Garcia',
          'Jill Felix',
          'Iya Gueco',
          'Rev Santos',
          'Rose Lyn Pedayo',
          'Theresa Padin',
          'Winshayna Young - Rivera'
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
          '101 Folk Street',
          '28th of December (invites by Story Machine)',
          'Kasali.PH',
          'Fel and Ink',
          'Ink Scribbler',
          'Lance Chee',
          'Neonovelties',
          'Pat and Fi',
          'PopGram',
          'Print and Co.',
          'Print Divas',
          'Prinsonalities',
          'The Story Machine (Illustration)',
          'WINK Written In Ink',
          'Write Impressions Paperie and Press Inc.'
        ]
      },
      {
        title: 'Graphic Artists & Calligraphers',
        vendors: [
          'Angela Chua',
          'Estudio Harana',
          'Fel and Ink',
          'Figma by Kara Silva',
          'Kasali',
          'Camille Go',
          'Fozzy Castro-Dayrit (TheFozzyBook)',
          'Icka Santos',
          'Jaycie Tanseco Flores',
          'Kathryn Puyat',
          'Patty Py'
        ]
      },
      {
        title: 'Embroidery & Specialty Prints',
        vendors: [
          'By Grace Creatives',
          'Panyo Embroidered',
          'Creative Preppers (Personalized Accessories)',
          'Paper Jam (reasonably priced missalettes)'
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
          'Beadybeadz Personalized Wedding Cords',
          'Creative Preppers',
          'Wedding Cords and Accessories by Diane Lane'
        ]
      },
      {
        title: 'Curated Gift Boxes & Favors',
        vendors: [
          'Cosette and Simon Artisan Gift Design Studio',
          'Gift Craft MNL',
          'Made with Love Favors',
          'The Rustic Craft',
          'Auro (Edible Favors)',
          'Neg’s Kitchen PH',
          'Theo and Filo',
          'Pamaypay ni Nanay (Fans)',
          'Casa Juan (Filipino Inspired)',
          'Liwayway PH',
          'Pamana – Abel Blankets'
        ]
      },
      {
        title: 'Personalized Favors & Interactive Booths',
        vendors: [
          'Creative Preppers',
          'High Caliber',
          'Stella Personalized Collection',
          'Thinker Box',
          '360 Cam Spin Video',
          'BaiCapture Inc.',
          'Easy Pics',
          'Flipbooks by Flipbook Projects',
          'Paparazzzzi',
          'Pose and Print',
          'Team OSS',
          'Vela (Onsite Favors)',
          'Sky and Co',
          'Artisans of Hope (Social Enterprise)',
          'Ben and Bart (Disposable Cameras)'
        ]
      },
      {
        title: 'Live Painting & Artists',
        vendors: [
          'Anagrace Bingculado',
          'Britney Myishia Art',
          'Caricatures by Krystina Bogus',
          'Michelle Sy',
          'Shannah Leigh',
          'Zoro Jones Art'
        ]
      },
      {
        title: 'Bridal & Gift Registry',
        vendors: [
          'Crate and Barrel',
          'Dimensione',
          'Gourdo’s',
          'Landmark Department Store',
          'Pottery Barn',
          'Rustan’s Weddings and Beyond Bridal Registry',
          'SM Department Store',
          'West Elm'
        ]
      }
    ]
  }
]

function isSpecialVendor(vendor: string): boolean {
  const clean = vendor.toLowerCase()
  return clean.includes('creative preppers')
}

const filteredCategories = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const categoryFilter = selectedCategoryId.value

  return categories
    .filter((cat) => {
      if (categoryFilter !== 'all' && cat.id !== categoryFilter) {
        return false
      }
      return true
    })
    .map((cat) => {
      if (!query) {
        return cat
      }

      const matchingSubcategories = cat.subcategories
        .map((sub) => {
          const matchingVendors = sub.vendors.filter((v) => v.toLowerCase().includes(query))
          if (matchingVendors.length > 0) {
            return { ...sub, vendors: matchingVendors }
          }
          if (sub.title.toLowerCase().includes(query)) {
            return sub
          }
          return null
        })
        .filter(Boolean) as VendorSubCategory[]

      return {
        ...cat,
        subcategories: matchingSubcategories
      }
    })
    .filter((cat) => cat.subcategories.length > 0)
})

const totalVendorsCount = computed(() => {
  let count = 0
  for (const cat of categories) {
    for (const sub of cat.subcategories) {
      count += sub.vendors.length
    }
  }
  return count
})
</script>

<template>
  <div class="min-h-screen bg-toast-700 text-white pt-24 lg:pt-28 pb-20 px-4 sm:px-6 lg:px-8">
    <div class="max-w-6xl mx-auto space-y-8">

      <!-- Hero Header -->
      <div class="text-center space-y-4 max-w-3xl mx-auto">
        <h1 class="text-4xl sm:text-5xl font-bold font-serif text-bread-400">
          Our Trusted Suppliers
        </h1>
        <p class="text-base sm:text-lg text-white/90 leading-relaxed">
          Explore our curated directory of over {{ totalVendorsCount }} top-tier catering companies, stylists,
          photographers, musicians, and wedding specialists to make your celebration extraordinary.
        </p>
      </div>

      <!-- Main Content Container (styled consistently with Terms page) -->
      <div class="bread-container bg-bread-400 text-toast-900 p-6 sm:p-10 lg:p-12 space-y-8">

        <!-- Search & Filter Controls -->
        <div class="space-y-4 border-b border-toast-600/20 pb-6">
          <div class="max-w-md mx-auto">
            <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="Search by supplier name or category..."
              size="lg" class="w-full bg-white/90 rounded-xl" />
          </div>

          <!-- Category Chips -->
          <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button type="button"
              class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer"
              :class="selectedCategoryId === 'all'
                ? 'bg-toast-600 text-white shadow-xs'
                : 'bg-white/80 text-toast-800 hover:bg-white border border-toast-300/40'"
              @click="selectedCategoryId = 'all'">
              All Categories
            </button>
            <button v-for="cat in categories" :key="cat.id" type="button"
              class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5"
              :class="selectedCategoryId === cat.id
                ? 'bg-toast-600 text-white shadow-xs'
                : 'bg-white/80 text-toast-800 hover:bg-white border border-toast-300/40'"
              @click="selectedCategoryId = cat.id">
              <UIcon :name="cat.icon" class="size-3.5" />
              <span>{{ cat.title }}</span>
            </button>
          </div>
        </div>

        <!-- No Results State -->
        <div v-if="filteredCategories.length === 0" class="text-center py-12 space-y-3">
          <div class="size-12 rounded-full bg-toast-600/10 text-toast-600 flex items-center justify-center mx-auto">
            <UIcon name="i-lucide-search-x" class="size-6" />
          </div>
          <h3 class="text-xl font-bold font-serif text-toast-900">No Suppliers Found</h3>
          <p class="text-sm text-toast-700/80 max-w-sm mx-auto">
            We couldn't find any suppliers matching "{{ searchQuery }}". Try searching for a different keyword or reset
            filters.
          </p>
          <UButton color="primary" variant="soft" size="sm" class="font-medium mt-2"
            @click="searchQuery = ''; selectedCategoryId = 'all'">
            Clear Filters
          </UButton>
        </div>

        <!-- Supplier Category Sections -->
        <div v-else class="space-y-12">
          <section v-for="cat in filteredCategories" :key="cat.id" class="space-y-6 scroll-mt-28">
            <!-- Category Header Banner -->
            <div class="flex items-center gap-3 border-b-2 border-toast-600/20 pb-3">
              <div class="size-10 rounded-xl bg-toast-600 text-white flex items-center justify-center shadow-xs">
                <UIcon :name="cat.icon" class="size-5" />
              </div>
              <div>
                <h2 class="text-2xl sm:text-3xl font-bold font-serif text-toast-800">
                  {{ cat.title }}
                </h2>
              </div>
            </div>

            <!-- Subcategories Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div v-for="sub in cat.subcategories" :key="sub.title"
                class="bg-white/85 border border-toast-300/40 rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow duration-200">
                <div class="space-y-3">
                  <h3 class="text-sm font-bold uppercase tracking-wider text-toast-600 border-b border-toast-200 pb-2">
                    {{ sub.title }}
                  </h3>

                  <ul class="space-y-2 text-sm text-toast-900">
                    <li v-for="vendor in sub.vendors" :key="vendor" class="flex items-center justify-between gap-2">
                      <!-- Special Subtle Highlight for Creative Preppers with Facebook Link -->
                      <a v-if="isSpecialVendor(vendor)" href="https://www.facebook.com/CreativePreppers" target="_blank"
                        rel="noopener noreferrer"
                        class="w-full flex items-center justify-between font-sans text-toast-900 font-bold group cursor-pointer no-underline py-0.5"
                        title="Visit Creative Preppers on Facebook">
                        <span class="flex items-center gap-2 font-sans">
                          <div class="w-4 flex items-center justify-center shrink-0">
                            <UIcon name="i-ph-sparkle-fill"
                              class="size-4 text-toast-600 shrink-0 group-hover:scale-110 transition-transform duration-150" />
                          </div>
                          <span class="font-sans font-bold no-underline group-hover:text-toast-600 transition-colors">{{
                            vendor }}</span>
                        </span>
                        <UBadge color="warning" variant="solid" size="xs"
                          class="font-medium text-[10px] uppercase tracking-wider font-sans">
                          Featured
                        </UBadge>
                      </a>

                      <!-- Normal Vendor Item -->
                      <div v-else class="flex items-center gap-2">
                        <div class="w-3.5 flex items-center justify-center shrink-0">
                          <span class="size-1.5 rounded-full bg-toast-400"></span>
                        </div>
                        <span class="font-normal">{{ vendor }}</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Footer Callout -->
        <div class="border-t border-toast-600/20 pt-8 mt-10 text-center space-y-3">
          <h3 class="text-xl font-bold font-serif text-toast-900">
            Are you an event vendor or partner?
          </h3>
          <p class="text-sm text-toast-800/80 max-w-lg mx-auto">
            Join the Bread + Butter ecosystem to connect with celebrants, manage bookings, and coordinate directly with
            event organizers.
          </p>
          <div class="pt-2 flex justify-center gap-3">
            <UButton to="/partners/signup" color="primary" size="md"
              class="font-bold shadow-md bg-toast-600 hover:bg-toast-700 text-white">
              Partner With Us
            </UButton>
            <UButton to="/contact-us" variant="outline" color="neutral" size="md"
              class="font-medium text-toast-800 border-toast-300 hover:bg-white">
              Contact Support
            </UButton>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped></style>
