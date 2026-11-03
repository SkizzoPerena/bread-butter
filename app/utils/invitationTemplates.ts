export interface InvitationTemplatePreset {
  id: string
  name: string
  eventType: string
  icon: string
  headerLabel: string
  headline: string
  hostNamePlaceholder?: string
  defaultHostName?: string
  requestLine: string
  primaryNamePlaceholder: string
  defaultMessage: string
  scheduleType: 'single' | 'dual'
  ceremonyTitle?: string
  ceremonyTime?: string
  ceremonyVenue?: string
  receptionTitle?: string
  receptionTime?: string
  receptionVenue?: string
  celebrationTitle?: string
  eventTime?: string
  eventVenue?: string
  deadlineText: string
  ctaButtonText: string
}

export const INVITATION_TEMPLATES: InvitationTemplatePreset[] = [
  {
    id: 'wedding',
    name: 'Wedding',
    eventType: 'Wedding',
    icon: 'i-lucide-heart',
    headerLabel: 'WEDDING INVITATION',
    headline: '',
    requestLine: 'Together with their families,',
    primaryNamePlaceholder: '[Name] & [Name]',
    defaultMessage: 'request the honor of your presence as they celebrate their marriage.',
    scheduleType: 'dual',
    ceremonyTitle: 'Ceremony',
    ceremonyTime: '2:00 PM',
    ceremonyVenue: 'St. Mary Cathedral',
    receptionTitle: 'Reception',
    receptionTime: '5:00 PM',
    receptionVenue: 'The Grand Ballroom',
    deadlineText: 'Kindly confirm your attendance by [RSVP Deadline].',
    ctaButtonText: 'Confirm Attendance',
  },
  {
    id: '18th-birthday',
    name: '18th Birthday',
    eventType: '18th Birthday',
    icon: 'i-lucide-sparkles',
    headerLabel: '18TH BIRTHDAY INVITATION',
    headline: 'A Night to Remember',
    requestLine: 'Together with her family,',
    primaryNamePlaceholder: "[Celebrant's Name]",
    defaultMessage: 'requests the honor of your presence as she celebrates her 18th birthday and the beginning of a beautiful new chapter.',
    scheduleType: 'single',
    celebrationTitle: 'Celebration',
    eventTime: '6:00 PM',
    eventVenue: 'The Glass Pavilion',
    deadlineText: 'Kindly confirm your attendance by [RSVP Deadline].',
    ctaButtonText: 'Confirm Attendance',
  },
  {
    id: 'baptismal',
    name: 'Baptismal',
    eventType: 'Baptismal',
    icon: 'i-lucide-droplets',
    headerLabel: 'BAPTISM INVITATION',
    headline: 'A Blessed Celebration',
    requestLine: 'With grateful hearts and joyful spirits,\nwe invite you to celebrate the baptism of',
    primaryNamePlaceholder: "[Child's Name]",
    defaultMessage: 'as we welcome our little one into the Christian faith.',
    scheduleType: 'dual',
    ceremonyTitle: 'Baptism Ceremony',
    ceremonyTime: '10:00 AM',
    ceremonyVenue: 'Holy Family Parish',
    receptionTitle: 'Reception',
    receptionTime: '12:00 PM',
    receptionVenue: 'The Courtyard Hall',
    deadlineText: 'Kindly confirm your attendance by [RSVP Deadline].',
    ctaButtonText: 'Confirm Attendance',
  },
  {
    id: 'birthday',
    name: 'Birthday',
    eventType: 'Birthday',
    icon: 'i-lucide-cake',
    headerLabel: 'BIRTHDAY INVITATION',
    headline: "Let's Celebrate!",
    requestLine: "Another year, another reason to celebrate!\nYou're warmly invited to celebrate",
    primaryNamePlaceholder: "[Celebrant's Name]",
    defaultMessage: 'as we gather for a special day filled with laughter, good company, and wonderful memories.',
    scheduleType: 'single',
    celebrationTitle: 'Celebration',
    eventTime: '5:00 PM',
    eventVenue: 'Clubhouse Manila',
    deadlineText: 'Kindly confirm your attendance by [RSVP Deadline].',
    ctaButtonText: 'Confirm Attendance',
  },
  {
    id: 'anniversary',
    name: 'Anniversary',
    eventType: 'Anniversary',
    icon: 'i-lucide-wine',
    headerLabel: 'WEDDING ANNIVERSARY INVITATION',
    headline: 'A Celebration of Love',
    requestLine: 'Through the years, countless memories and a love worth celebrating.\nTogether with their family,',
    primaryNamePlaceholder: "[Couple's Names]",
    defaultMessage: 'request the pleasure of your company as they celebrate their 25th Wedding Anniversary.',
    scheduleType: 'single',
    celebrationTitle: 'Celebration',
    eventTime: '6:00 PM',
    eventVenue: 'Bellevue Gardens',
    deadlineText: 'Kindly confirm your attendance by [RSVP Deadline].',
    ctaButtonText: 'Confirm Attendance',
  },
  {
    id: 'corporate-event',
    name: 'Corporate Event',
    eventType: 'Corporate Event',
    icon: 'i-lucide-briefcase',
    headerLabel: 'CORPORATE EVENT INVITATION',
    headline: "You're Invited!",
    hostNamePlaceholder: '[Company / Organization Name]',
    defaultHostName: '[Company / Organization Name]',
    requestLine: 'is pleased to invite you to',
    primaryNamePlaceholder: '[Event Name]',
    defaultMessage: 'We look forward to bringing everyone together for this special occasion and would be delighted to have you join us.',
    scheduleType: 'single',
    celebrationTitle: 'Event',
    eventTime: '6:00 PM',
    eventVenue: 'The Grand Ballroom',
    deadlineText: 'Kindly confirm your attendance by [RSVP Deadline].',
    ctaButtonText: 'Confirm Attendance',
  },
  {
    id: 'general-celebrations',
    name: 'General Celebrations',
    eventType: 'General Celebrations',
    icon: 'i-lucide-party-popper',
    headerLabel: 'EVENT INVITATION',
    headline: "You're Invited!",
    requestLine: "Some moments are better when celebrated together.\n\nWe'd love for you to join us for",
    primaryNamePlaceholder: '[Event Name]',
    defaultMessage: 'as we gather for a special occasion filled with good company and memorable moments.',
    scheduleType: 'single',
    celebrationTitle: 'Celebration',
    eventTime: '6:00 PM',
    eventVenue: 'The Event Center',
    deadlineText: 'Kindly confirm your attendance by [RSVP Deadline].',
    ctaButtonText: 'Confirm Attendance',
  },
]

export const INVITATION_TEMPLATES_BY_ID: Record<string, InvitationTemplatePreset> = Object.fromEntries(
  INVITATION_TEMPLATES.map((tmpl) => [tmpl.id, tmpl]),
)

export function getTemplateForEventType(eventType?: string | null): InvitationTemplatePreset {
  if (!eventType) return INVITATION_TEMPLATES[0]!
  const normalized = eventType.toLowerCase().trim()
  if (normalized.includes('18')) return INVITATION_TEMPLATES_BY_ID['18th-birthday']!
  if (normalized.includes('birth')) return INVITATION_TEMPLATES_BY_ID['birthday']!
  if (normalized.includes('wed') && !normalized.includes('anniv')) return INVITATION_TEMPLATES_BY_ID['wedding']!
  if (normalized.includes('anniv')) return INVITATION_TEMPLATES_BY_ID['anniversary']!
  if (normalized.includes('bapt')) return INVITATION_TEMPLATES_BY_ID['baptismal']!
  if (normalized.includes('corp')) return INVITATION_TEMPLATES_BY_ID['corporate-event']!
  return INVITATION_TEMPLATES_BY_ID['general-celebrations'] || INVITATION_TEMPLATES[0]!
}

export function getTemplateById(id?: string | null): InvitationTemplatePreset {
  if (id && INVITATION_TEMPLATES_BY_ID[id]) {
    return INVITATION_TEMPLATES_BY_ID[id]
  }
  return INVITATION_TEMPLATES[0]!
}
