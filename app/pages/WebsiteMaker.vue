<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

// 1. Website Data
const websiteData = reactive({
    siteTitle: 'Jane & John ties the knot',
    siteDescription: 'A story of love, life, and commitment',
    domainName: '',
    contactEmail: '', // Default motif
    motif: 'Classic Romance',
    colorPalette: 'Magenta & Blush', // Default color palette
    typography: 'Romantic Script', // Default typography set
    headerImage: '', // New: Header background image URL
    endingTitle: 'Hope to see you there!',
    endingMessage: 'We cannot wait to celebrate this special day with all of our favorite people.'
})

// Motif Data
const motifs = [
    { name: 'Classic Romance', image: 'https://images.unsplash.com/photo-1655712001226-37df6c2733ce?q=80&w=2070&auto=format&fit=crop', description: 'Timeless elegance with soft pastels and delicate details.', palette: 'Magenta & Blush', typography: 'Romantic Script' },
    { name: 'Boho Desert', image: 'https://images.unsplash.com/photo-1655712001226-37df6c2733ce?q=80&w=2070&auto=format&fit=crop', description: 'Free-spirited and earthy with natural textures and warm tones.', palette: 'Terracotta & Sand', typography: 'Whimsical Script' },
    { name: 'Modern Minimalist', image: 'https://images.unsplash.com/photo-1655712001226-37df6c2733ce?q=80&w=2070&auto=format&fit=crop', description: 'Clean lines, simple color palettes, and a focus on architecture.', palette: 'Slate & Steel', typography: 'Modern Sans' },
    { name: 'Enchanted Forest', image: 'https://images.unsplash.com/photo-1655712001226-37df6c2733ce?q=80&w=2070&auto=format&fit=crop', description: 'Lush greenery, deep emeralds, and a magical woodland atmosphere.', palette: 'Emerald & Ivory', typography: 'Casual Script' },
    { name: 'Vintage Glamour', image: 'https://images.unsplash.com/photo-1655712001226-37df6c2733ce?q=80&w=2070&auto=format&fit=crop', description: 'Old Hollywood opulence with rich burgundy and bold contrasts.', palette: 'Burgundy & Cream', typography: 'Bold & Expressive' },
    { name: 'Coastal Serenity', image: 'https://images.unsplash.com/photo-1655712001226-37df6c2733ce?q=80&w=2070&auto=format&fit=crop', description: 'Breezy and calm with soft blues, sage greens, and ocean vibes.', palette: 'Teal & Coral', typography: 'Casual Script' },
    { name: 'Royal Elegance', image: 'https://images.unsplash.com/photo-1655712001226-37df6c2733ce?q=80&w=2070&auto=format&fit=crop', description: 'Regal and sophisticated with deep purples and luxurious accents.', palette: 'Lilac & Amethyst', typography: 'Romantic Script' },
    { name: 'Starry Night', image: 'https://images.unsplash.com/photo-1655712001226-37df6c2733ce?q=80&w=2070&auto=format&fit=crop', description: 'A dreamy evening under the stars with deep blues and golden hues.', palette: 'Navy & Gold', typography: 'Elegant Serif' }
]

const selectMotif = (motif: typeof motifs[0]) => {
    websiteData.motif = motif.name
    websiteData.colorPalette = motif.palette
    websiteData.typography = motif.typography
}

// Interface for Color Palette
interface ColorPalette {
    name: string;
    colors: {
        background: string;
        surface: string;
        primary: string;
        text: string;
        heading: string;
    };
}

// Color Palette Data
const colorPalettes: ColorPalette[] = [
    {
        name: 'Magenta & Blush',
        colors: { background: '#FFF5F8', surface: '#FCE0EB', primary: '#B83269', text: '#4A152D', heading: '#2D0A1A' }
    },
    {
        name: 'Terracotta & Sand',
        colors: { background: '#FCF8F5', surface: '#F2E8E1', primary: '#A85A3A', text: '#4A2616', heading: '#2B140B' }
    },
    {
        name: 'Slate & Steel',
        colors: { background: '#111111', surface: '#222222', primary: '#888888', text: '#EEEEEE', heading: '#FAFAFA' }
    },
    {
        name: 'Emerald & Ivory',
        colors: { background: '#071A10', surface: '#123320', primary: '#459B6A', text: '#E3F0E6', heading: '#F5FAF6' }
    },
    {
        name: 'Burgundy & Cream',
        colors: { background: '#FDF7F7', surface: '#F5E6E8', primary: '#8B2635', text: '#3A0E15', heading: '#20050A' }
    },
    {
        name: 'Teal & Coral',
        colors: { background: '#F2FAFA', surface: '#DDF0F0', primary: '#207A7A', text: '#0C3333', heading: '#051A1A' }
    },
    {
        name: 'Lilac & Amethyst',
        colors: { background: '#F8F4FF', surface: '#EBE0F8', primary: '#9D7BCE', text: '#4B3869', heading: '#2A1744' }
    },
    {
        name: 'Navy & Gold',
        colors: { background: '#0B1320', surface: '#1A2A40', primary: '#C59A45', text: '#E2E8F0', heading: '#F4F7FA' }
    }
]

// Interface for Typography Set
interface TypographySet {
    name: string;
    headerFont: string;
    subheaderFont: string;
    bodyFont: string;
    description: string;
}

// Typography Data
const typographySets: TypographySet[] = [
    { name: 'Romantic Script', headerFont: 'Parisienne', subheaderFont: 'Gambetta', bodyFont: 'Satoshi', description: 'A formal script paired with an elegant serif and clean sans.' },
    { name: 'Casual Script', headerFont: 'Engagement', subheaderFont: 'Sentient', bodyFont: 'Switzer', description: 'A lively, bouncing script matched with a robust serif and crisp sans.' },
    { name: 'Whimsical Script', headerFont: 'Great Vibes', subheaderFont: 'Quicksand', bodyFont: 'Outfit', description: 'An informal script with a soft, rounded sans-serif combination.' },
    { name: 'Elegant Serif', headerFont: 'Boska', subheaderFont: 'Rowan', bodyFont: 'General Sans', description: 'A sophisticated high-contrast serif for headings with a readable serif and sans.' },
    { name: 'Bold & Expressive', headerFont: 'Melodrama', subheaderFont: 'Satoshi', bodyFont: 'Amulya', description: 'Fashionable, high-contrast headings combined with humanistic body fonts.' },
    { name: 'Modern Sans', headerFont: 'Clash Display', subheaderFont: 'Bespoke Sans', bodyFont: 'Switzer', description: 'Clean, contemporary, and versatile sans-serifs throughout.' }
]

// 2. Dynamic Content Sections
interface WebsiteSection {
    id: number;
    type: 'heading' | 'paragraph'; // Simplified for initial example
    content: string;
}

const sections = ref<WebsiteSection[]>([
    { id: Date.now(), type: 'heading', content: '"Love is composed of a single soul inhabiting two bodies"' },
    { id: Date.now() + 1, type: 'paragraph', content: 'This is a section about your story together. Add more here!' }
])

const headingSection = computed(() => sections.value.find(s => s.type === 'heading'))
const paragraphSection = computed(() => sections.value.find(s => s.type === 'paragraph'))

const isLive = ref(false)
const currentStep = ref(0) // 0-indexed for steps

const selectedPalette = computed<ColorPalette>(() => {
    return colorPalettes.find(p => p.name === websiteData.colorPalette) || colorPalettes[0]!
})

const selectedTypography = computed<TypographySet>(() => {
    return typographySets.find(p => p.name === websiteData.typography) || typographySets[0]!
})

const selectedHeaderFile = ref<File | undefined>();

const websiteSteps = [
    { label: '1. Choose a Motif', icon: 'i-lucide-palette', slot: 'choose-motif', description: "Select a design template that matches your wedding style." },
    { label: '2. Header Image', icon: 'i-lucide-image', slot: 'header-image', description: "Upload a captivating image for your website's header." }, // New Step
    { label: '3. Color Palette', icon: 'i-lucide-swatch-book', slot: 'color-palette', description: "Choose a color scheme that will be used across your website." },
    { label: '4. Typography', icon: 'i-lucide-type', slot: 'typography', description: "Select a font pairing for your website\'s headings and text." },
    { label: '5. Basic Information', icon: 'i-lucide-info', slot: 'basic-info', description: "Provide the essential details for your website, like the title, description, and contact information." },
    { label: '6. Content Sections', icon: 'i-lucide-layout-template', slot: 'content-sections', description: "Add and arrange content sections like headings and paragraphs to build your page." },
    { label: '7. Tidbits', icon: 'i-lucide-list', slot: 'tidbits', description: "Add unlimited sections with a heading and a paragraph to share more stories." },
    { label: '8. Schedule', icon: 'i-lucide-calendar', slot: 'schedule', description: "List the events of your special day, complete with times and locations." },
    { label: '9. Thank You Message', icon: 'i-lucide-heart-handshake', slot: 'thank-you', description: "Add a closing message or thank you note to your guests." },
    { label: '10. Review & Publish', icon: 'i-lucide-check-circle', slot: 'review-publish', description: "Review all your website details and publish it to go live." }
]

const addContentSection = (type: 'heading' | 'paragraph') => {
    const newId = Date.now() + sections.value.length; // Ensure unique ID
    if (type === 'heading' && !headingSection.value) {
        sections.value.push({ id: newId, type: 'heading', content: 'Love is composed of a single soul inhabiting two bodies' });
    } else if (type === 'paragraph' && !paragraphSection.value) {
        sections.value.push({ id: newId, type: 'paragraph', content: 'This is a section about your story together. Add more here!' });
    }
}

const removeContentSection = (id: number) => {
    sections.value = sections.value.filter(section => section.id !== id);
}

// 3. Tidbits Section
interface Tidbit {
    id: number;
    heading: string;
    paragraph: string;
}

const tidbits = ref<Tidbit[]>([
])

const addTidbit = () => {
    tidbits.value.push({ id: Date.now() + tidbits.value.length, heading: 'New Tidbit', paragraph: 'Add some details here.' })
}

const removeTidbit = (id: number) => {
    tidbits.value = tidbits.value.filter(t => t.id !== id)
}

// 4. Schedule Section
interface ScheduleItem {
    id: number;
    title: string;
    description: string;
    location: string;
}

const scheduleItems = ref<ScheduleItem[]>([])

const addScheduleItem = () => {
    scheduleItems.value.push({ id: Date.now() + scheduleItems.value.length, title: 'New Event', description: 'Event details here.', location: '' })
}

const removeScheduleItem = (id: number) => {
    scheduleItems.value = scheduleItems.value.filter(s => s.id !== id)
}

watch(selectedHeaderFile, (newFile) => {
    if (newFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            websiteData.headerImage = e.target?.result as string;
        };
        reader.readAsDataURL(newFile);
    } else {
        websiteData.headerImage = ''; // Clear image if no file selected
    }
}, { immediate: true }); // Watch immediately to handle initial state if any


const toggleLive = () => {
    isLive.value = !isLive.value
}

// Computed properties to grab specific sections if needed, similar to RSVPMaker
// For now, we'll just iterate over `sections` directly in the preview.

</script>

<template>
    <div class="relative w-full min-h-screen bpb-pattern">

        <!-- Top Toolbar: Custom UDashboardNavbar -->
        <UDashboardNavbar class="bg-white w-full sticky top-0 z-50 event-navbar">

            <!-- LEFT SIDE: Back Button & Image Slot -->
            <template #left>
                <div class="flex items-center gap-3">
                    <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" class="rounded-lg"
                        aria-label="Go back" to="/UserDashboard" />

                    <!-- Image Slot Wrapper -->
                    <img src="..\assets\bpb-icons\logo-toast.svg" class="h-7" />
                    <div class="font-serif text-xl font-bold">Website Maker</div>
                </div>
            </template>

            <!-- RIGHT SIDE: Status & Actions -->
            <template #right>
                <div class="flex items-center gap-4">
                    <div v-if="isLive" class="text-sm md:text-base font-medium text-success-600 dark:text-success-400">
                        ✨ Your website is live!
                    </div>

                    <UButton :icon="isLive ? 'i-lucide-pencil' : 'i-lucide-check-circle'"
                        :color="isLive ? 'neutral' : 'primary'" @click="toggleLive">
                        {{ isLive ? 'Edit Website' : 'Go Live' }}
                    </UButton>
                </div>
            </template>

        </UDashboardNavbar>

        <!-- Main Content Container -->
        <UContainer>
            <div class="mb-8"></div>
            <UPageGrid class="items-start" :grid="{ cols: isLive ? '1' : '1 md:4' }">

                <!-- LEFT SIDE: Step Navigation (Editor Mode) -->
                <UPageCard class="bread-container col-span-1 p-0 sm:p-0  overflow-hidden"
                    :ui="{ container: 'p-0 sm:p-0 lg:p-0' }">
                    <UScrollArea v-if="!isLive" class=" h-full max-h-[calc(100vh-125px)]">
                        <UPageCard class="border-transparent ring-transparent bg-none">



                            <!-- MIDDLE SECTION: Step Content (Editor Mode) -->
                            <div v-if="!isLive" class="">
                                <div class="relative flex justify-center items-center text-xl font-semibold mb-1">
                                    <UButton v-if="currentStep > 0" icon="i-lucide-arrow-left" color="neutral"
                                        variant="ghost" class="absolute left-0 p-2" aria-label="Previous Step"
                                        @click="currentStep--" />
                                    <span>{{ websiteSteps[currentStep]!.label }}</span>
                                </div>
                                <p class="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
                                    {{ websiteSteps[currentStep]!.description }}
                                </p>


                                <!-- Step 1: Choose a Motif -->
                                <div v-if="currentStep === 0" class="">
                                    <div class="grid grid-cols-2 gap-4">
                                        <div v-for="motif in motifs" :key="motif.name"
                                            class="relative rounded-lg overflow-hidden cursor-pointer group transition-all duration-300"
                                            :class="{ 'ring-4 ring-primary-500 shadow-lg': websiteData.motif === motif.name }"
                                            @click="selectMotif(motif)" style="height: 100px;">
                                            <img :src="motif.image" :alt="motif.name"
                                                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                            <div
                                                class="absolute inset-0 bg-toast-900/10 group-hover:bg-opacity-40 transition-all duration-300">
                                            </div>
                                            <div v-if="websiteData.motif === motif.name"
                                                class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white">
                                                <UIcon name="i-lucide-check" class="h-4 w-4" />
                                            </div>
                                            <div class="absolute bottom-0 left-0 p-2">
                                                <h4 class="font-semibold text-white text-sm drop-shadow-md">{{
                                                    motif.name }}
                                                </h4>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Step 2: Choose a Color Palette -->
                                <div v-if="currentStep === 2" class="">
                                    <div class="grid grid-cols-2 gap-4">
                                        <div v-for="palette in colorPalettes" :key="palette.name"
                                            class="relative rounded-lg overflow-hidden cursor-pointer group transition-all duration-300 border"
                                            :class="{ 'ring-4 ring-primary-500 shadow-lg': websiteData.colorPalette === palette.name, 'border-gray-200 dark:border-gray-700': websiteData.colorPalette !== palette.name }"
                                            @click="websiteData.colorPalette = palette.name">

                                            <div class="h-20 flex">
                                                <div v-for="(color, key) in palette.colors" :key="key"
                                                    class="w-full h-full" :style="{ backgroundColor: color }"></div>
                                            </div>

                                            <div
                                                class="absolute inset-0 group-hover:bg-opacity-20 transition-all duration-300">
                                            </div>
                                            <div v-if="websiteData.colorPalette === palette.name"
                                                class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white">
                                                <UIcon name="i-lucide-check" class="h-4 w-4" />
                                            </div>
                                            <div class="absolute bottom-0 left-0 p-2 bg-black/20 w-full">
                                                <h4 class="font-semibold text-white text-sm drop-shadow-md text-left">{{
                                                    palette.name }}
                                                </h4>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Step 3: Upload Header Image -->
                                <div v-if="currentStep === 1" class="flex flex-col gap-4">
                                    <UFormField label="Header Background Image">
                                        <UFileUpload v-model="selectedHeaderFile" :multiple="false" accept="image/*"
                                            size="xl" variant="area" label="Drop your image here"
                                            description="PNG, JPG, GIF (max. 5MB)" />
                                        <UButton v-if="websiteData.headerImage" icon="i-lucide-x" color="error"
                                            variant="ghost" class="mt-2" block
                                            @click="selectedHeaderFile = undefined; websiteData.headerImage = ''">
                                            Clear Image
                                        </UButton>
                                    </UFormField>
                                </div>

                                <!-- Step 4: Choose Typography -->
                                <div v-if="currentStep === 3" class="">
                                    <div class="grid grid-cols-1 gap-4">
                                        <div v-for="set in typographySets" :key="set.name"
                                            class="rounded-lg cursor-pointer group transition-all duration-300 border p-3 flex flex-col justify-between"
                                            :class="{ 'ring-4 ring-primary-500 shadow-lg': websiteData.typography === set.name, 'border-gray-200 dark:border-gray-700': websiteData.typography !== set.name }"
                                            @click="websiteData.typography = set.name">

                                            <div>
                                                <h3 class="text-2xl" :style="{ fontFamily: `'${set.headerFont}'` }">
                                                    Aa -
                                                    {{ set.headerFont }}</h3>
                                                <h4 class="text-lg mt-1"
                                                    :style="{ fontFamily: `'${set.subheaderFont}'` }">
                                                    Aa -
                                                    {{ set.subheaderFont }}</h4>
                                                <p class="text-base mt-3" :style="{ fontFamily: `'${set.bodyFont}'` }">
                                                    The quick
                                                    brown fox jumps over the lazy dog.</p>
                                            </div>

                                            <div class="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <h4 class="font-semibold text-sm text-gray-800 dark:text-gray-200">{{
                                                    set.name
                                                    }}</h4>
                                                <p class="text-xs text-gray-500 dark:text-gray-400">{{ set.description
                                                    }}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                <!-- Step 5: Basic Information -->
                                <div v-if="currentStep === 4" class="flex flex-col gap-4 ">
                                    <UFormField label="Site Title">
                                        <UInput v-model="websiteData.siteTitle" placeholder="e.g., My Portfolio"
                                            class="w-full" />
                                    </UFormField>

                                    <UFormField label="Site Description">
                                        <UTextarea v-model="websiteData.siteDescription"
                                            placeholder="A short description of your website." class="w-full" />
                                    </UFormField>

                                    <UFormField label="Domain Name">
                                        <UInput v-model="websiteData.domainName" placeholder="jane-loves-john"
                                            icon="i-lucide-globe" class="w-full" :ui="{
                                                base: 'pl-32',
                                                leading: 'pointer-events-none'
                                            }">
                                            <template #leading>
                                                <p class="text-sm text-muted">
                                                    bread-butter.com/
                                                </p>
                                            </template>

                                        </UInput>
                                    </UFormField>

                                    <UFormField label="Contact Email">
                                        <UInput type="email" v-model="websiteData.contactEmail"
                                            placeholder="e.g., info@mywebsite.com" icon="i-lucide-mail"
                                            class="w-full" />
                                    </UFormField>
                                </div>

                                <!-- Step 6: Content Sections -->
                                <div v-if="currentStep === 5" class="flex flex-col gap-6 ">
                                    <div class="items-center space-y-4">

                                        <div v-if="!headingSection && !paragraphSection"
                                            class="text-center text-gray-500 italic">No
                                            sections
                                            added
                                            yet.
                                        </div>

                                        <UButton v-if="!headingSection" icon="i-lucide-plus" color="primary"
                                            variant="solid" block @click="addContentSection('heading')">
                                            Add Heading
                                        </UButton>

                                        <div v-if="headingSection" class="flex flex-col gap-2 border border-toast-100 p-3 rounded-lg">
                                            <div class="flex justify-between items-center">
                                                <span class="font-medium capitalize">Heading</span>
                                                <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm"
                                                    @click="removeContentSection(headingSection.id)" />
                                            </div>
                                            <UFormField>
                                                <UInput v-model="headingSection.content"
                                                    placeholder="Enter heading text" class="w-full" />
                                            </UFormField>
                                        </div>

                                        <UButton v-if="!paragraphSection" icon="i-lucide-plus" color="primary"
                                            variant="solid" block @click="addContentSection('paragraph')">
                                            Add Paragraph
                                        </UButton>


                                        <div v-if="paragraphSection" class="flex flex-col gap-2 border border-toast-100 p-3 rounded-lg">
                                            <div class="flex justify-between items-center">
                                                <span class="font-medium capitalize">Paragraph</span>
                                                <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm"
                                                    @click="removeContentSection(paragraphSection.id)" />
                                            </div>
                                            <UFormField>
                                                <UTextarea v-model="paragraphSection.content"
                                                    placeholder="Enter paragraph content" class="w-full" />
                                            </UFormField>
                                        </div>
                                    </div>
                                </div>

                                <!-- Step 7: Tidbits -->
                                <div v-if="currentStep === 6" class="flex flex-col gap-6 ">
                                    <div class="items-center space-y-4">

                                        <div v-if="tidbits.length === 0" class="text-center text-gray-500 italic">No
                                            tidbits
                                            added
                                            yet.
                                        </div>

                                        <UButton icon="i-lucide-plus" color="primary" variant="solid" block
                                            @click="addTidbit()">
                                            Add Tidbit
                                        </UButton>

                                        <div v-for="tidbit in tidbits" :key="tidbit.id"
                                            class="flex flex-col gap-2  border border-toast-100 p-3 rounded-lg">
                                            <div class="flex justify-between items-center">
                                                <span class="font-medium capitalize">Tidbit</span>
                                                <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm"
                                                    @click="removeTidbit(tidbit.id)" />
                                            </div>
                                            <UFormField label="Question">
                                                <UInput v-model="tidbit.heading" placeholder="Enter tidbit heading"
                                                    class="w-full" />
                                            </UFormField>
                                            <UFormField label="Answer">
                                                <UTextarea v-model="tidbit.paragraph"
                                                    placeholder="Enter tidbit paragraph" class="w-full" />
                                            </UFormField>
                                        </div>
                                    </div>
                                </div>

                                <!-- Step 8: Schedule -->
                                <div v-if="currentStep === 7" class="flex flex-col gap-6 ">
                                    <div class="items-center space-y-4">

                                        <div v-if="scheduleItems.length === 0" class="text-center text-gray-500 italic">
                                            No
                                            events
                                            added
                                            yet.
                                        </div>

                                        <UButton icon="i-lucide-plus" color="primary" variant="solid" block
                                            @click="addScheduleItem()">
                                            Add Event
                                        </UButton>

                                        <div v-for="item in scheduleItems" :key="item.id"
                                            class="flex flex-col gap-2  border border-toast-100 p-3 rounded-lg">
                                            <div class="flex justify-between items-center">
                                                <span class="font-medium capitalize">Event</span>
                                                <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm"
                                                    @click="removeScheduleItem(item.id)" />
                                            </div>
                                            <UFormField label="Title">
                                                <UInput v-model="item.title" placeholder="Enter event title"
                                                    class="w-full" />
                                            </UFormField>
                                            <UFormField label="Description">
                                                <UTextarea v-model="item.description"
                                                    placeholder="Enter event description" class="w-full" />
                                            </UFormField>
                                            <UFormField label="Location (Optional)">
                                                <UInput v-model="item.location" placeholder="Enter location"
                                                    class="w-full" />
                                            </UFormField>
                                        </div>
                                    </div>
                                </div>

                                <!-- Step 9: Thank You Message -->
                                <div v-if="currentStep === 8" class="flex flex-col gap-4 ">
                                    <UFormField label="Closing Title">
                                        <UInput v-model="websiteData.endingTitle" placeholder="e.g., We can't wait!"
                                            class="w-full" />
                                    </UFormField>

                                    <UFormField label="Closing Message">
                                        <UTextarea v-model="websiteData.endingMessage"
                                            placeholder="Write a sweet thank you note or final invitation line."
                                            class="w-full" />
                                    </UFormField>
                                </div>

                                <!-- Step 10: Review & Publish -->
                                <div v-if="currentStep === 9" class="flex flex-col gap-4 ">
                                    <div class="space-y-2">
                                        <p><strong>Domain:</strong> {{ websiteData.domainName || 'N/A' }}</p>
                                        <p><strong>Title:</strong> {{ websiteData.siteTitle || 'N/A' }}</p>
                                        <p><strong>Motif:</strong> {{ websiteData.motif || 'N/A' }}</p>
                                        <p><strong>Color Palette:</strong> {{ websiteData.colorPalette || 'N/A' }}</p>
                                        <p><strong>Typography:</strong> {{ websiteData.typography || 'N/A' }}</p>
                                    </div>
                                    <UButton color="primary" block @click="toggleLive">
                                        Publish Website
                                    </UButton>
                                </div>

                                <div class="flex justify-end mt-6 ">
                                    <UButton v-if="currentStep < websiteSteps.length - 1" icon="i-lucide-arrow-right"
                                        color="primary" @click="currentStep++" block class="items-center">
                                        Next Step
                                    </UButton>
                                </div>

                            </div>
                        </UPageCard>
                    </UScrollArea>
                </UPageCard>

                <!-- RIGHT SIDE: Live Preview / Final Website -->
                <UPageCard :class="isLive ? 'col-span-full shadow-2xl max-w-4xl mx-auto w-full' : 'col-span-2 w-full'"
                    class="flex flex-col gap-6 transition-colors duration-500 rounded-xl overflow-hidden ring-transparent bread-container"
                    :ui="{ container: 'p-0 sm:p-0 lg:p-0' }">
                    <div class="h-full w-full flex-1 flex flex-col transition-colors duration-500" :style="{
                        backgroundColor: selectedPalette.colors.background,
                        fontFamily: `'${selectedTypography.bodyFont}'`,
                    }">
                        <UScrollArea class="h-full max-h-[calc(100vh-125px)] z-20">



                            <div class="flex flex-col gap-8 text-center py-10 px-6 relative justify-end min-h-[35vh]"
                                :class="{ 'h-[50vh]': websiteData.headerImage }" :style="{
                                    backgroundImage: websiteData.headerImage ? `url(${websiteData.headerImage})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                    minHeight: websiteData.headerImage ? '50vh' : 'auto', // Ensure image is visible
                                }">
                                <!-- Overlay for readability -->
                                <div v-if="websiteData.headerImage" class="absolute inset-0 z-0"
                                    :style="{ backgroundImage: `linear-gradient(to bottom, transparent 40%, ${selectedPalette.colors.primary}80)` }">
                                </div>
                                <div class="relative z-10">

                                    <div class="space-y-3">
                                        <h1 class="text-4xl md:text-5xl font-medium"
                                            :style="{ color: websiteData.headerImage ? 'white' : selectedPalette.colors.heading, fontFamily: `'${selectedTypography.headerFont}'` }">
                                            {{ websiteData.siteTitle || 'Your Site Title' }}
                                        </h1>
                                        <p class="text-lg"
                                            :style="{ color: websiteData.headerImage ? 'white' : selectedPalette.colors.text }">
                                            {{ websiteData.siteDescription || 'Your site description goes here.' }}
                                        </p>

                                    </div>
                                </div>
                            </div>

                            <!-- Dynamic Content Sections Preview -->
                            <div class="flex flex-col justify-center mx-10 py-20 text-center">
                                <UContainer v-if="headingSection" class="text-3xl font-bold italic "
                                    :style="{ color: selectedPalette.colors.heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                    {{ headingSection.content }}
                                </UContainer>
                                <div v-if="paragraphSection" class="prose max-w-none mx-auto text-center"
                                    :style="{ color: selectedPalette.colors.text }">
                                    {{ paragraphSection.content }}
                                </div>
                            </div>



                            <!-- Tidbits Preview -->
                            <div v-if="tidbits.length > 0" class="flex flex-col gap-10 px-6 text-center py-20" :style="{
                                backgroundColor: selectedPalette.colors.text,
                            }">
                                <div class="text-3xl font-bold"
                                    :style="{ color: selectedPalette.colors.background, fontFamily: `'${selectedTypography.headerFont}'` }">
                                    Tidbits</div>


                                <div v-for="tidbit in tidbits" :key="tidbit.id" class="flex flex-col gap-3">
                                    <h3 class="text-2xl font-bold"
                                        :style="{ color: selectedPalette.colors.background, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                        {{ tidbit.heading }}
                                    </h3>
                                    <div class="prose max-w-none mx-auto text-center"
                                        :style="{ color: selectedPalette.colors.background }">
                                        {{ tidbit.paragraph }}
                                    </div>
                                </div>
                            </div>



                            <!-- Schedule Preview -->
                            <div v-if="scheduleItems.length > 0" class="flex flex-col gap-10 px-6 py-20 text-center">
                                <div class="text-3xl font-bold"
                                    :style="{ color: selectedPalette.colors.heading, fontFamily: `'${selectedTypography.headerFont}'` }">
                                    Schedule</div>

                                <div v-for="item in scheduleItems" :key="item.id" class="flex flex-col gap-3">
                                    <h3 class="text-2xl font-bold"
                                        :style="{ color: selectedPalette.colors.heading, fontFamily: `'${selectedTypography.subheaderFont}'` }">
                                        {{ item.title }}
                                    </h3>
                                    <div class="prose max-w-none mx-auto text-center"
                                        :style="{ color: selectedPalette.colors.text }">
                                        {{ item.description }}
                                    </div>
                                    <div v-if="item.location" class="text-sm font-semibold italic mt-2"
                                        :style="{ color: selectedPalette.colors.heading }">
                                        <UIcon name="i-lucide-map-pin" class="mr-1 inline-block align-middle" />{{
                                        item.location
                                        }}
                                    </div>
                                </div>
                            </div>

                            <!-- Thank You / Ending Preview -->
                            <div class="flex flex-col gap-6 px-6 py-20 text-center"
                                :style="{ backgroundColor: selectedPalette.colors.surface }">
                                <h2 class="text-3xl font-bold"
                                    :style="{ color: selectedPalette.colors.heading, fontFamily: `'${selectedTypography.headerFont}'` }">
                                    {{ websiteData.endingTitle }}
                                </h2>
                                <p class="prose max-w-none mx-auto text-lg text-center"
                                    :style="{ color: selectedPalette.colors.text }">
                                    {{ websiteData.endingMessage }}
                                </p>
                            </div>
                            <!-- Bread + Butter Branding Footer -->
                            <div class="py-10 flex flex-col items-center justify-center gap-3 border-t"
                                :style="{ backgroundColor: selectedPalette.colors.heading, borderColor: selectedPalette.colors.surface }">
                                <p class="text-xs font-semibold uppercase tracking-widest opacity-60"
                                    :style="{ color: selectedPalette.colors.background }">This website was made with</p>
                                <div class="h-6 w-full opacity-80 mask-logo"
                                    :style="{ backgroundColor: selectedPalette.colors.background }" role="img"
                                    aria-label="Bread + Butter"></div>
                            </div>




                        </UScrollArea>
                    </div>
                </UPageCard>

            </UPageGrid>
        </UContainer>
    </div>
</template>

<style scoped>
/* Add any specific styles for WebsiteMaker here if needed */
.mask-logo {
    -webkit-mask: url('../assets/B+B Logos-03.svg') no-repeat center / contain;
    mask: url('../assets/B+B Logos-03.svg') no-repeat center / contain;
}

/* Force font preloading for dynamically bound fonts */
.font-preload-parisienne {
    font-family: 'Parisienne', cursive;
}

.font-preload-engagement {
    font-family: 'Engagement', cursive;
}

.font-preload-greatvibes {
    font-family: 'Great Vibes', cursive;
}

.font-preload-boska {
    font-family: 'Boska', serif;
}

.font-preload-melodrama {
    font-family: 'Melodrama', sans-serif;
}

.font-preload-clash {
    font-family: 'Clash Display', sans-serif;
}

.font-preload-gambetta {
    font-family: 'Gambetta', serif;
}

.font-preload-sentient {
    font-family: 'Sentient', serif;
}

.font-preload-quicksand {
    font-family: 'Quicksand', sans-serif;
}

.font-preload-rowan {
    font-family: 'Rowan', serif;
}

.font-preload-satoshi {
    font-family: 'Satoshi', sans-serif;
}

.font-preload-bespoke {
    font-family: 'Bespoke Sans', sans-serif;
}

.font-preload-switzer {
    font-family: 'Switzer', sans-serif;
}

.font-preload-outfit {
    font-family: 'Outfit', sans-serif;
}

.font-preload-general {
    font-family: 'General Sans', sans-serif;
}

.font-preload-amulya {
    font-family: 'Amulya', sans-serif;
}
</style>