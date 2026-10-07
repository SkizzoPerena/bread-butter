export interface WhereToStayAccommodation {
    id: string
    name: string
    rating?: string
    distance?: string
    description?: string
    image?: string
    link?: string
    phone?: string
    notes?: string
}

export interface SuggestedAccommodation {
    name: string
    rating: string
    reviewsCount: string
    distance: string
    description: string
    image?: string
    badge?: string
    tags?: string[]
}

export function getAccommodationImage(hotel?: { name?: string; image?: string }): string {
    if (hotel?.image && hotel.image.trim()) {
        return hotel.image.trim()
    }
    const fallbacks = [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1549294413-26f195200c16?auto=format&fit=crop&w=700&q=80'
    ]
    const name = hotel?.name || ''
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) >>> 0
    }
    return fallbacks[hash % fallbacks.length] || fallbacks[0]!
}

export const defaultAccommodations: WhereToStayAccommodation[] = [
    {
        id: 'acc-1',
        name: 'The Grand Hotel & Suites',
        rating: '4.8 ★',
        distance: '5 mins from venue',
        description: 'Luxury rooms & suites with grand ballroom and fine dining.',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=80',
        link: ''
    },
    {
        id: 'acc-2',
        name: 'Boutique Garden Resort',
        rating: '4.7 ★',
        distance: '10 mins away',
        description: 'Scenic garden view, private verandas & pool lounge.',
        image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=700&q=80',
        link: ''
    },
    {
        id: 'acc-3',
        name: 'City Center Hotel & Spa',
        rating: '4.6 ★',
        distance: '15 mins away',
        description: 'Modern central amenities with full luxury wellness spa.',
        image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=700&q=80',
        link: ''
    },
    {
        id: 'acc-4',
        name: 'Cozy Inn & Bed & Breakfast',
        rating: '4.9 ★',
        distance: '8 mins away',
        description: 'Charming breakfast stay with scenic hillside views.',
        image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=700&q=80',
        link: ''
    }
]

export const destinationHotelsDatabase: Record<string, SuggestedAccommodation[]> = {
    tagaytay: [
        {
            name: 'Taal Vista Hotel',
            rating: '4.8 ★',
            reviewsCount: '3,420+ reviews',
            distance: '0.5 km from venue',
            description: 'Iconic ridge hotel with panoramic Taal Lake & Volcano views, luxury rooms & dining.',
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=80',
            badge: 'Most Popular',
            tags: ['Lake View', 'Swimming Pool', 'Buffet Breakfast']
        },
        {
            name: 'Discovery Country Suites',
            rating: '4.9 ★',
            reviewsCount: '1,280+ reviews',
            distance: '1.2 km from venue',
            description: 'Exclusive boutique bed & breakfast country manor with personalized luxury hospitality.',
            image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=700&q=80',
            badge: 'Top Rated',
            tags: ['Boutique', 'Cozy Manor', 'Gourmet Breakfast']
        },
        {
            name: 'Escala Tagaytay',
            rating: '4.8 ★',
            reviewsCount: '2,150+ reviews',
            distance: '1.8 km from venue',
            description: 'Modern luxury retreat famous for its picturesque infinity pool overlooking the crater ridge.',
            image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=700&q=80',
            badge: 'Infinity Pool',
            tags: ['Infinity Pool', 'Ridge Balcony', 'Modern Design']
        },
        {
            name: 'Anya Resort Tagaytay',
            rating: '4.9 ★',
            reviewsCount: '1,890+ reviews',
            distance: '3.5 km from venue',
            description: 'Tranquil sanctuary with private villas, award-winning Nira Spa, and fine dining.',
            image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=700&q=80',
            badge: 'Luxury Villas',
            tags: ['Private Villas', 'Luxury Spa', 'Fine Dining']
        },
        {
            name: 'Twin Lakes Hotel',
            rating: '4.7 ★',
            reviewsCount: '2,780+ reviews',
            distance: '4.2 km from venue',
            description: 'European vineyard-inspired architecture with expansive mountain and valley vistas.',
            image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=700&q=80',
            badge: 'Vineyard Style',
            tags: ['Vineyard Views', 'Spacious Suites', 'Heated Pool']
        },
        {
            name: 'Hotel Kimberly Tagaytay',
            rating: '4.7 ★',
            reviewsCount: '1,640+ reviews',
            distance: '2.0 km from venue',
            description: 'Lush garden grounds with outdoor movie nights, animal farm, and family relaxation.',
            image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=700&q=80',
            tags: ['Lush Garden', 'Family Friendly', 'Complimentary Breakfast']
        }
    ],
    manila: [
        {
            name: 'The Peninsula Manila',
            rating: '4.9 ★',
            reviewsCount: '5,800+ reviews',
            distance: 'Makati CBD',
            description: 'Iconic luxury grande dame featuring the timeless Lobby, world-class dining, and lavish suites.',
            image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=700&q=80',
            badge: 'Iconic 5-Star',
            tags: ['5-Star Luxury', 'The Lobby', 'Swimming Pool']
        },
        {
            name: 'Shangri-La The Fort, Manila',
            rating: '4.9 ★',
            reviewsCount: '4,920+ reviews',
            distance: 'Bonifacio Global City',
            description: 'Modern urban luxury with Kerry Sports Manila, high-floor skyline views, and premier dining.',
            image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=700&q=80',
            badge: 'Top Luxury BGC',
            tags: ['High-floor Views', 'Kerry Sports', 'BGC Center']
        },
        {
            name: 'Solaire Resort Entertainment City',
            rating: '4.8 ★',
            reviewsCount: '6,100+ reviews',
            distance: 'Aseana Bay Area',
            description: 'Opulent bay-view resort with sunset pool terraces, fine dining, and casino luxury suites.',
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=80',
            badge: 'Bay Resort',
            tags: ['Manila Bay Sunset', 'Luxury Spa', 'Casino Resort']
        },
        {
            name: 'The Manila Hotel',
            rating: '4.7 ★',
            reviewsCount: '4,450+ reviews',
            distance: 'Historic Intramuros Area',
            description: 'Historic landmark since 1912 offering timeless Philippine heritage luxury by Manila Bay.',
            image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=700&q=80',
            badge: 'Historic Landmark',
            tags: ['Historic 1912', 'Bay View', 'Champagne Room']
        }
    ],
    cebu: [
        {
            name: 'Shangri-La Mactan, Cebu',
            rating: '4.9 ★',
            reviewsCount: '4,100+ reviews',
            distance: 'Punta Engaño, Mactan',
            description: 'Tropical paradise beachfront resort with private marine sanctuary and Chi Spa retreats.',
            image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=700&q=80',
            badge: 'Beachfront Paradise',
            tags: ['Marine Sanctuary', 'Chi Spa', 'Private Beach']
        },
        {
            name: 'Crimson Resort and Spa Mactan',
            rating: '4.8 ★',
            reviewsCount: '3,340+ reviews',
            distance: 'Mactan Coastline',
            description: 'Chic beach resort featuring an iconic three-tiered infinity pool facing the Hilutungan Channel.',
            image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=700&q=80',
            badge: 'Tiered Pool',
            tags: ['3-Tier Infinity Pool', 'Azure Beach Club', 'Private Villas']
        },
        {
            name: 'Plantation Bay Resort and Spa',
            rating: '4.7 ★',
            reviewsCount: '3,890+ reviews',
            distance: 'Marigondon, Mactan',
            description: 'Man-made saltwater lagoons with colonial architecture and spacious secluded beach rooms.',
            image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=700&q=80',
            tags: ['Saltwater Lagoons', 'Colonial Style', 'Archery & Kayaks']
        }
    ],
    baguio: [
        {
            name: 'The Manor at Camp John Hay',
            rating: '4.9 ★',
            reviewsCount: '4,300+ reviews',
            distance: 'Camp John Hay',
            description: 'Classic country log cabin luxury surrounded by towering pine trees and mountain air.',
            image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=700&q=80',
            badge: 'Pine Sanctuary',
            tags: ['Camp John Hay', 'Pine Gardens', 'Piano Lounge']
        },
        {
            name: 'Baguio Country Club',
            rating: '4.9 ★',
            reviewsCount: '2,900+ reviews',
            distance: 'Country Club Road',
            description: 'Prestigious historic clubhouse surrounded by immaculate golf fairways and famous bakery treats.',
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=80',
            badge: 'Exclusive Club',
            tags: ['Golf Course', 'Exclusive Club', 'Famous Pastries']
        },
        {
            name: 'Grand Sierra Pines Baguio',
            rating: '4.8 ★',
            reviewsCount: '2,640+ reviews',
            distance: 'North Outlook Drive',
            description: 'Serene eco-friendly sanctuary with private pine forest views, mini art gallery, and quiet spa.',
            image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=700&q=80',
            tags: ['Eco Sanctuary', 'Art Gallery', 'Forest Balconies']
        },
        {
            name: 'Le Monet Hotel',
            rating: '4.7 ★',
            reviewsCount: '2,180+ reviews',
            distance: 'Camp John Hay',
            description: 'Boutique floral retreat with heated indoor swimming pool and warm country atmosphere.',
            image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=700&q=80',
            tags: ['Heated Pool', 'Camp John Hay', 'Breakfast Buffet']
        }
    ],
    newyork: [
        {
            name: 'The Plaza Hotel',
            rating: '4.8 ★',
            reviewsCount: '11,200+ reviews',
            distance: '0.1 km from Central Park',
            description: 'Centuries of storied elegance overlooking Central Park South, with white-glove butler service.',
            image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=700&q=80',
            badge: 'Historic 5-Star',
            tags: ['5-Star Luxury', 'Central Park South', 'Palm Court']
        },
        {
            name: 'The Ritz-Carlton New York, Central Park',
            rating: '4.9 ★',
            reviewsCount: '3,840+ reviews',
            distance: 'Direct Central Park View',
            description: 'Townhouse-style luxury with bespoke Central Park vistas, Contour lounge, and La Prairie spa.',
            image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=700&q=80',
            badge: 'Park Views',
            tags: ['Central Park Views', 'Bespoke Service', 'Luxury Spa']
        },
        {
            name: '1 Hotel Central Park',
            rating: '4.8 ★',
            reviewsCount: '2,980+ reviews',
            distance: '1 block from Central Park',
            description: 'Eco-conscious luxury sanctuary crafted with reclaimed natural materials and living greenery.',
            image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=700&q=80',
            badge: 'Eco-Luxury',
            tags: ['Sustainable Design', 'Jams Dining', 'Park Proximity']
        },
        {
            name: 'Mandarin Oriental New York',
            rating: '4.8 ★',
            reviewsCount: '3,110+ reviews',
            distance: 'Columbus Circle',
            description: 'High-floor panoramic views of Central Park and the Manhattan skyline with 5-star spa amenities.',
            image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=700&q=80',
            tags: ['Skyline Panoramas', '5-Star Spa', 'Indoor Lap Pool']
        }
    ]
}

export function getDynamicAccommodations(location: string): SuggestedAccommodation[] {
    const locLower = (location || '').toLowerCase()
    for (const [key, hotels] of Object.entries(destinationHotelsDatabase)) {
        if (locLower.includes(key)) {
            return hotels
        }
    }
    // Check common aliases
    if (locLower.includes('makati') || locLower.includes('bgc') || locLower.includes('bonifacio') || locLower.includes('intramuros')) {
        return destinationHotelsDatabase.manila || []
    }
    if (locLower.includes('mactan')) {
        return destinationHotelsDatabase.cebu || []
    }
    if (locLower.includes('central park') || locLower.includes('manhattan') || locLower.includes('brooklyn') || locLower.includes('ny')) {
        return destinationHotelsDatabase.newyork || []
    }

    const clean = (location || '').trim() || 'Wedding Venue'
    return [
        {
            name: `The Grand Hotel & Suites ${clean}`,
            rating: '4.9 ★',
            reviewsCount: '1,840+ reviews',
            distance: '0.8 km from venue',
            description: `Premier 5-star luxury stay with spacious bridal suites, fine dining, and prime accessibility in ${clean}.`,
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=80',
            badge: 'Top Rated',
            tags: ['5-Star Luxury', 'Bridal Suites', 'Free Breakfast']
        },
        {
            name: `${clean} Boutique Resort & Spa`,
            rating: '4.8 ★',
            reviewsCount: '1,420+ reviews',
            distance: '1.5 km from venue',
            description: `Charming boutique retreat offering tranquil gardens, relaxation spa, and scenic photo spots in ${clean}.`,
            image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=700&q=80',
            badge: 'Boutique Pick',
            tags: ['Garden Retreat', 'Full Spa', 'Scenic Grounds']
        },
        {
            name: `Heritage Manor & Country Club ${clean}`,
            rating: '4.8 ★',
            reviewsCount: '980+ reviews',
            distance: '2.3 km from venue',
            description: `Classic estate elegance surrounded by lush greenery, event-friendly rooms, and warm hospitality.`,
            image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=700&q=80',
            badge: 'Heritage Estate',
            tags: ['Estate Grounds', 'Event Friendly', 'Fine Dining']
        },
        {
            name: `Courtyard & Suites ${clean}`,
            rating: '4.7 ★',
            reviewsCount: '1,650+ reviews',
            distance: '3.0 km from venue',
            description: `Modern accommodations with comfortable amenities, pool deck, and convenient transportation links.`,
            image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=700&q=80',
            tags: ['Modern Comfort', 'Swimming Pool', 'Free High-speed Wi-Fi']
        },
        {
            name: `The Vista Villas at ${clean}`,
            rating: '4.8 ★',
            reviewsCount: '870+ reviews',
            distance: '4.5 km from venue',
            description: `Scenic hilltop villas offering panoramic landscape views and intimate private celebration spaces.`,
            image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=700&q=80',
            badge: 'Private Villas',
            tags: ['Private Villas', 'Panoramic Views', 'Family Friendly']
        }
    ]
}
