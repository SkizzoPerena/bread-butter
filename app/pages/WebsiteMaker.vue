<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

// 1. Website Data
const websiteData = reactive({
    siteTitle: 'Jane & John ties the knot',
    siteDescription: 'A story of love, life, and commitment',
    domainName: '',
    contactEmail: '', // Default motif
    motif: 'Classic Romance',
    colorPalette: 'Blush & Gold', // Default color palette
    typography: 'Elegant Serif', // Default font pairing
    headerImage: '', // New: Header background image URL
    endingTitle: 'Hope to see you there!',
    endingMessage: 'We cannot wait to celebrate this special day with all of our favorite people.'
})

// Motif Data
const motifs = [
    { name: 'Classic Romance', image: 'https://images.unsplash.com/photo-1655712001226-37df6c2733ce?q=80&w=2070&auto=format&fit=crop', description: 'Timeless elegance with soft pastels and delicate details.' },
    { name: 'Bohemian Chic', image: 'https://images.unsplash.com/photo-1655712001226-37df6c2733ce?q=80&w=2070&auto=format&fit=crop', description: 'Free-spirited and earthy with natural textures and wildflowers.' },
    { name: 'Modern Minimalist', image: 'https://images.unsplash.com/photo-1655712001226-37df6c2733ce?q=80&w=2070&auto=format&fit=crop', description: 'Clean lines, simple color palettes, and a focus on architecture.' },
    { name: 'Rustic Charm', image: 'https://images.unsplash.com/photo-1655712001226-37df6c2733ce?q=80&w=2070&auto=format&fit=crop', description: 'Cozy and warm with wooden elements, burlap, and countryside vibes.' },
    { name: 'Glamorous Gatsby', image: 'https://images.unsplash.com/photo-1655712001226-37df6c2733ce?q=80&w=2070&auto=format&fit=crop', description: 'Art Deco opulence with gold, black, and geometric patterns.' },
    { name: 'Tropical Paradise', image: 'https://images.unsplash.com/photo-1655712001226-37df6c2733ce?q=80&w=2070&auto=format&fit=crop', description: 'Vibrant and lush with bold florals, palm leaves, and bright colors.' }
]

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
        name: 'Blush & Gold',
        colors: { background: '#FFF9F9', surface: '#F2E2E2', primary: '#8A6327', text: '#3E3232', heading: '#5B2A2A' }
    },
    {
        name: 'Navy & White',
        colors: { background: '#0A192F', surface: '#172A45', primary: '#215E9E', text: '#E6F1FF', heading: '#FFFFFF' }
    },
    {
        name: 'Dusty Blue & Sage',
        colors: { background: '#F5F7F8', surface: '#E1E7EC', primary: '#365A42', text: '#2C3E50', heading: '#1A252F' }
    },
    {
        name: 'Burgundy & Cream',
        colors: { background: '#38040E', surface: '#5C101A', primary: '#8A1C24', text: '#FDFBF6', heading: '#FFFFFF' }
    },
    {
        name: 'Emerald & Ivory',
        colors: { background: '#022B18', surface: '#054D2E', primary: '#0A7A44', text: '#F0FDF4', heading: '#FFFFFF' }
    },
    {
        name: 'Terracotta & Pampas',
        colors: { background: '#FCF6F0', surface: '#F0E1D3', primary: '#9C4122', text: '#4A3225', heading: '#6B2A15' }
    }
]

// Interface for Font Pairing
interface FontPairing {
    name: string;
    headingFont: string;
    bodyFont: string;
    description: string;
}

// Typography Data
const fontPairings: FontPairing[] = [
    { name: 'Elegant Serif', headingFont: 'Gambetta', bodyFont: 'Satoshi', description: 'A classic and readable combination.' },
    { name: 'Modern Sans', headingFont: 'Satoshi', bodyFont: 'Switzer', description: 'Clean, contemporary, and versatile.' },
    { name: 'Romantic Script', headingFont: 'Pencerio', bodyFont: 'Satoshi', description: 'A beautiful script for headings with a clean body font.' },
    { name: 'Bold & Expressive', headingFont: 'Melodrama', bodyFont: 'Satoshi', description: 'High-contrast and fashionable for a statement look.' },
    { name: 'Classic Read', headingFont: 'Lora', bodyFont: 'Satoshi', description: 'A well-balanced serif and sans-serif for readability.' },
    { name: 'Refined & Sturdy', headingFont: 'Erode', bodyFont: 'Switzer', description: 'A serif with character paired with a reliable sans-serif.' }
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

const selectedFontPairing = computed<FontPairing>(() => {
    return fontPairings.find(p => p.name === websiteData.typography) || fontPairings[0]!
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
                        <UPageCard class="border-transparent ring-transparent bg-none"
                        >



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
                                            @click="websiteData.motif = motif.name" style="height: 120px;">
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

                                <!-- Step 2: Upload Header Image -->
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

                                <!-- Step 3: Choose Typography -->
                                <div v-if="currentStep === 3" class="">
                                    <div class="grid grid-cols-1 gap-4">
                                        <div v-for="pairing in fontPairings" :key="pairing.name"
                                            class="rounded-lg cursor-pointer group transition-all duration-300 border p-3 flex flex-col justify-between"
                                            :class="{ 'ring-4 ring-primary-500 shadow-lg': websiteData.typography === pairing.name, 'border-gray-200 dark:border-gray-700': websiteData.typography !== pairing.name }"
                                            @click="websiteData.typography = pairing.name">

                                            <div>
                                                <h3 class="text-xl" :style="{ fontFamily: `'${pairing.headingFont}'` }">
                                                    Aa -
                                                    {{
                                                        pairing.headingFont }}</h3>
                                                <p class="text-base mt-2"
                                                    :style="{ fontFamily: `'${pairing.bodyFont}'` }">
                                                    The quick
                                                    brown fox jumps over the lazy dog.</p>
                                            </div>

                                            <div class="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <h4 class="font-semibold text-sm text-gray-800 dark:text-gray-200">{{
                                                    pairing.name
                                                }}</h4>
                                                <p class="text-xs text-gray-500 dark:text-gray-400">{{
                                                    pairing.description
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
                                        <UInput v-model="websiteData.domainName" placeholder="e.g., mywebsite.com"
                                            icon="i-lucide-globe" class="w-full" />
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

                                        <div v-if="headingSection" class="flex flex-col gap-2 border p-3 rounded-lg">
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


                                        <div v-if="paragraphSection" class="flex flex-col gap-2 border p-3 rounded-lg">
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

                                        <div v-if="tidbits.length === 0"
                                            class="text-center text-gray-500 italic">No
                                            tidbits
                                            added
                                            yet.
                                        </div>

                                        <UButton icon="i-lucide-plus" color="primary"
                                            variant="solid" block @click="addTidbit()">
                                            Add Tidbit
                                        </UButton>

                                        <div v-for="tidbit in tidbits" :key="tidbit.id" class="flex flex-col gap-2 border p-3 rounded-lg">
                                            <div class="flex justify-between items-center">
                                                <span class="font-medium capitalize">Tidbit</span>
                                                <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm"
                                                    @click="removeTidbit(tidbit.id)" />
                                            </div>
                                            <UFormField label="Question">
                                                <UInput v-model="tidbit.heading"
                                                    placeholder="Enter tidbit heading" class="w-full" />
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

                                        <div v-if="scheduleItems.length === 0"
                                            class="text-center text-gray-500 italic">No
                                            events
                                            added
                                            yet.
                                        </div>

                                        <UButton icon="i-lucide-plus" color="primary"
                                            variant="solid" block @click="addScheduleItem()">
                                            Add Event
                                        </UButton>

                                        <div v-for="item in scheduleItems" :key="item.id" class="flex flex-col gap-2 border p-3 rounded-lg">
                                            <div class="flex justify-between items-center">
                                                <span class="font-medium capitalize">Event</span>
                                                <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm"
                                                    @click="removeScheduleItem(item.id)" />
                                            </div>
                                            <UFormField label="Title">
                                                <UInput v-model="item.title"
                                                    placeholder="Enter event title" class="w-full" />
                                            </UFormField>
                                            <UFormField label="Description">
                                                <UTextarea v-model="item.description"
                                                    placeholder="Enter event description" class="w-full" />
                                            </UFormField>
                                            <UFormField label="Location (Optional)">
                                                <UInput v-model="item.location"
                                                    placeholder="Enter location" class="w-full" />
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
                                            placeholder="Write a sweet thank you note or final invitation line." class="w-full" />
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
                    :ui="{ container: 'p-0 sm:p-0 lg:p-0'}">
                    <div class="h-full w-full flex-1 flex flex-col transition-colors duration-500" :style="{
                        backgroundColor: selectedPalette.colors.background,
                        fontFamily: `'${selectedFontPairing.bodyFont}'`,
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
                                :style="{ backgroundImage: `linear-gradient(to bottom, transparent 50%, ${selectedPalette.colors.primary}80)` }">
                            </div>
                            <div class="relative z-10 space-y-4">

                                <div class="space-y-4">
                                    <h1 class="text-4xl md:text-5xl font-bold leading-tight"
                                        :style="{ color: websiteData.headerImage ? 'white' : selectedPalette.colors.heading, fontFamily: `'${selectedFontPairing.headingFont}'` }">
                                        {{ websiteData.siteTitle || 'Your Site Title' }}
                                    </h1>
                                    <p class="text-lg"
                                        :style="{ color: websiteData.headerImage ? 'white' : selectedPalette.colors.text }">
                                        {{ websiteData.siteDescription || 'Your site description goes here.' }}
                                    </p>
                            <p class="text-xs" :style="{ color: selectedPalette.colors.primary }">
                                Motif: {{ websiteData.motif }}
                            </p>
                                </div>
                            </div>
                        </div>

                        <!-- Dynamic Content Sections Preview -->
                        <div class="flex flex-col justify-center mx-10 py-20 text-center">
                            <UContainer v-if="headingSection" class="text-3xl font-bold italic "
                                :style="{ color: selectedPalette.colors.heading, fontFamily: `'${selectedFontPairing.headingFont}'` }">
                                {{ headingSection.content }}
                            </UContainer>
                            <div v-if="paragraphSection" class="prose max-w-none mx-auto text-center"
                                :style="{ color: selectedPalette.colors.text }">
                                {{ paragraphSection.content }}
                            </div>
                        </div>



                        <!-- Tidbits Preview -->
                        <div v-if="tidbits.length > 0" class="flex flex-col gap-10 px-6 text-center py-20"
                            :style="{
                        backgroundColor: selectedPalette.colors.text,
                    }"
                            >
                            <div class="text-3xl font-bold"
                            :style="{ color: selectedPalette.colors.background, fontFamily: `'${selectedFontPairing.headingFont}'` }">
                            Tidbits</div>


                            <div v-for="tidbit in tidbits" :key="tidbit.id" class="flex flex-col gap-3">
                                <h3 class="text-2xl font-bold" :style="{ color: selectedPalette.colors.background, fontFamily: `'${selectedFontPairing.headingFont}'` }">
                                    {{ tidbit.heading }}
                                </h3>
                                <div class="prose max-w-none mx-auto text-center" :style="{ color: selectedPalette.colors.background }">
                                    {{ tidbit.paragraph }}
                                </div>
                            </div>
                        </div>



                        <!-- Schedule Preview -->
                        <div v-if="scheduleItems.length > 0" class="flex flex-col gap-10 px-6 py-20 text-center">
                            <div class="text-3xl font-bold"
                            :style="{ color: selectedPalette.colors.heading, fontFamily: `'${selectedFontPairing.headingFont}'` }">
                            Schedule</div>

                            <div v-for="item in scheduleItems" :key="item.id" class="flex flex-col gap-3">
                                <h3 class="text-2xl font-bold" :style="{ color: selectedPalette.colors.heading, fontFamily: `'${selectedFontPairing.headingFont}'` }">
                                    {{ item.title }}
                                </h3>
                                <div class="prose max-w-none mx-auto text-center" :style="{ color: selectedPalette.colors.text }">
                                    {{ item.description }}
                                </div>
                                <div v-if="item.location" class="text-sm font-semibold italic mt-2"
                                    :style="{ color: selectedPalette.colors.heading }">
                                    <UIcon name="i-lucide-map-pin" class="mr-1 inline-block align-middle"/>{{ item.location }}
                                </div>
                            </div>
                        </div>

                        <!-- Thank You / Ending Preview -->
                        <div class="flex flex-col gap-6 px-6 py-20 text-center" :style="{ backgroundColor: selectedPalette.colors.surface }">
                            <h2 class="text-3xl font-bold"
                                :style="{ color: selectedPalette.colors.heading, fontFamily: `'${selectedFontPairing.headingFont}'` }">
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
                            <p class="text-xs font-semibold uppercase tracking-widest opacity-60" :style="{ color: selectedPalette.colors.background }">This website was made with</p>
                            <div class="h-6 w-full opacity-80 mask-logo" 
                                :style="{ backgroundColor: selectedPalette.colors.background}" 
                                role="img" aria-label="Bread + Butter"></div>
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
</style>