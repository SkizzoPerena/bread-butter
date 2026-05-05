<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

// 1. Website Data
const websiteData = reactive({
    siteTitle: 'My Awesome Website',
    siteDescription: 'A brief description of my awesome website.',
    domainName: '',
    contactEmail: '', // Default motif
    motif: 'Classic Romance',
    colorPalette: 'Blush & Gold', // Default color palette
    typography: 'Elegant Serif', // Default font pairing
    headerImage: '' // New: Header background image URL
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
        colors: { background: '#FFF9F9', surface: '#F9E0E0', primary: '#D4AF37', text: '#6B5B5B', heading: '#C8A2A2' }
    },
    {
        name: 'Navy & White',
        colors: { background: '#001F3F', surface: '#95a5a6', primary: '#FFFFFF', text: '#bdc3c7', heading: '#FFFFFF' }
    },
    {
        name: 'Dusty Blue & Sage',
        colors: { background: '#F5F6F5', surface: '#EAF0F3', primary: '#8EAFBF', text: '#546E7A', heading: '#829582' }
    },
    {
        name: 'Burgundy & Cream',
        colors: { background: '#800020', surface: '#D8C3A5', primary: '#F5E6D3', text: '#FDFBF6', heading: '#FFFFFF' }
    },
    {
        name: 'Emerald & Ivory',
        colors: { background: '#00583E', surface: '#DCD3C4', primary: '#F3EFE0', text: '#FFFFF7', heading: '#FFFFFF' }
    },
    {
        name: 'Terracotta & Pampas',
        colors: { background: '#FDFBF9', surface: '#F4F0E8', primary: '#E2725B', text: '#8B5E34', heading: '#BF5A42' }
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
    { id: Date.now(), type: 'heading', content: 'Welcome to My Website!' },
    { id: Date.now() + 1, type: 'paragraph', content: 'This is a paragraph about your website. You can add more content here.' }
])

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
    { label: '2. Color Palette', icon: 'i-lucide-swatch-book', slot: 'color-palette', description: "Choose a color scheme that will be used across your website." },
    { label: '3. Typography', icon: 'i-lucide-type', slot: 'typography', description: "Select a font pairing for your website\'s headings and text." },
    { label: '4. Header Image', icon: 'i-lucide-image', slot: 'header-image', description: "Upload a captivating image for your website's header." }, // New Step
    { label: '5. Basic Information', icon: 'i-lucide-info', slot: 'basic-info', description: "Provide the essential details for your website, like the title, description, and contact information." },
    { label: '6. Content Sections', icon: 'i-lucide-layout-template', slot: 'content-sections', description: "Add and arrange content sections like headings and paragraphs to build your page." },
    { label: '7. Review & Publish', icon: 'i-lucide-check-circle', slot: 'review-publish', description: "Review all your website details and publish it to go live." }
]

const addContentSection = (type: 'heading' | 'paragraph') => {
    const newId = Date.now() + sections.value.length; // Ensure unique ID
    if (type === 'heading') {
        sections.value.push({ id: newId, type: 'heading', content: 'New Heading' });
    } else {
        sections.value.push({ id: newId, type: 'paragraph', content: 'New paragraph content.' });
    }
}

const removeContentSection = (id: number) => {
    sections.value = sections.value.filter(section => section.id !== id);
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
    <div class="relative w-full min-h-screen">

        <!-- Top Toolbar: Custom UDashboardNavbar -->
        <UDashboardNavbar class="bg-bread-50/70 w-full sticky top-0 z-50 event-navbar">

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
                <UScrollArea v-if="!isLive" class="bread-container col-span-1 h-full max-h-[calc(100vh-100px)]">
                    <UPageCard class="bread-container">
                    <UVerticalNavigation :links="websiteSteps.map((step, index) => ({
                        label: step.label,
                        icon: step.icon,
                        click: () => currentStep = index,
                        active: currentStep === index
                    }))" />


                    <!-- MIDDLE SECTION: Step Content (Editor Mode) -->
                    <div v-if="!isLive" class="">
                        <div class="relative flex justify-center items-center text-xl font-semibold mb-1">
                            <UButton v-if="currentStep > 0" icon="i-lucide-arrow-left" color="neutral" variant="ghost"
                                class="absolute left-0 p-2" aria-label="Previous Step" @click="currentStep--" />
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
                                        <h4 class="font-semibold text-white text-sm drop-shadow-md">{{ motif.name }}
                                        </h4>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Step 2: Choose a Color Palette -->
                        <div v-if="currentStep === 1" class="">
                            <div class="grid grid-cols-2 gap-4">
                                <div v-for="palette in colorPalettes" :key="palette.name"
                                    class="relative rounded-lg overflow-hidden cursor-pointer group transition-all duration-300 border"
                                    :class="{ 'ring-4 ring-primary-500 shadow-lg': websiteData.colorPalette === palette.name, 'border-gray-200 dark:border-gray-700': websiteData.colorPalette !== palette.name }"
                                    @click="websiteData.colorPalette = palette.name">

                                    <div class="h-20 flex">
                                        <div v-for="(color, key) in palette.colors" :key="key" class="w-full h-full"
                                            :style="{ backgroundColor: color }"></div>
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

                            <!-- Step 3: Choose Typography -->
                            <div v-if="currentStep === 2" class="">
                                <div class="grid grid-cols-1 gap-4">
                                    <div v-for="pairing in fontPairings" :key="pairing.name" 
                                        class="rounded-lg cursor-pointer group transition-all duration-300 border p-3 flex flex-col justify-between"
                                        :class="{ 'ring-4 ring-primary-500 shadow-lg': websiteData.typography === pairing.name, 'border-gray-200 dark:border-gray-700': websiteData.typography !== pairing.name }"
                                        @click="websiteData.typography = pairing.name">
                                        
                                        <div>
                                            <h3 class="text-xl" :style="{ fontFamily: `'${pairing.headingFont}'` }">Aa - {{ pairing.headingFont }}</h3>
                                            <p class="text-base mt-2" :style="{ fontFamily: `'${pairing.bodyFont}'` }">The quick brown fox jumps over the lazy dog.</p>
                                        </div>

                                        <div class="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <h4 class="font-semibold text-sm text-gray-800 dark:text-gray-200">{{ pairing.name }}</h4>
                                            <p class="text-xs text-gray-500 dark:text-gray-400">{{ pairing.description }}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            <!-- Step 4: Upload Header Image -->
                            <div v-if="currentStep === 3" class="flex flex-col gap-4">
                                <UFormField label="Header Background Image">
                                    <UFileUpload
                                        v-model="selectedHeaderFile"
                                        :multiple="false"
                                        accept="image/*"
                                        size="xl"
                                        variant="area"
                                        label="Drop your image here"
                                        description="PNG, JPG, GIF (max. 5MB)"
                                    />
                                    <UButton v-if="websiteData.headerImage" icon="i-lucide-x" color="error" variant="ghost" class="mt-2" @click="selectedHeaderFile = undefined; websiteData.headerImage = ''">
                                        Clear Image
                                    </UButton>
                                </UFormField>
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
                                    placeholder="e.g., info@mywebsite.com" icon="i-lucide-mail" class="w-full" />
                            </UFormField>
                        </div>

                            <!-- Step 6: Content Sections -->
                            <div v-if="currentStep === 5" class="flex flex-col gap-6 ">
                            <div class="flex justify-between items-center">
                                <div class="text-lg font-semibold">Manage Sections</div>
                                <div class="flex gap-2">
                                    <UButton icon="i-lucide-plus" color="primary" variant="solid"
                                        @click="addContentSection('heading')">
                                        Add Heading
                                    </UButton>
                                    <UButton icon="i-lucide-plus" color="primary" variant="solid"
                                        @click="addContentSection('paragraph')">
                                        Add Paragraph
                                    </UButton>
                                </div>
                            </div>

                            <div v-if="sections.length === 0" class="text-center text-gray-500 italic">No sections
                                added
                                yet.
                            </div>

                            <div v-for="section in sections" :key="section.id"
                                class="flex flex-col gap-2 border p-3 rounded-lg">
                                <div class="flex justify-between items-center">
                                    <span class="font-medium capitalize">{{ section.type }}</span>
                                    <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm"
                                        @click="removeContentSection(section.id)" />
                                </div>
                                <UFormField :label="section.type === 'heading' ? 'Heading Text' : 'Paragraph Content'">
                                    <UInput v-if="section.type === 'heading'" v-model="section.content"
                                        :placeholder="`Enter ${section.type} text`" />
                                    <UTextarea v-else v-model="section.content"
                                        :placeholder="`Enter ${section.type} content`" />
                                </UFormField>
                            </div>
                        </div>

                            <!-- Step 7: Review & Publish -->
                            <div v-if="currentStep === 6" class="flex flex-col gap-4 ">
                            <h3 class="text-lg font-semibold">Review Your Website Details</h3>
                            <div class="space-y-2">
                                <p><strong>Title:</strong> {{ websiteData.siteTitle || 'N/A' }}</p>
                                <p><strong>Description:</strong> {{ websiteData.siteDescription || 'N/A' }}</p>
                                <p><strong>Motif:</strong> {{ websiteData.motif || 'N/A' }}</p>
                                <p><strong>Header Image:</strong> {{ websiteData.headerImage ? 'Set' : 'N/A' }}</p>
                                <p><strong>Color Palette:</strong> {{ websiteData.colorPalette || 'N/A' }}</p>
                                    <p><strong>Typography:</strong> {{ websiteData.typography || 'N/A' }}</p>
                                <p><strong>Domain:</strong> {{ websiteData.domainName || 'N/A' }}</p>
                                <p><strong>Contact:</strong> {{ websiteData.contactEmail || 'N/A' }}</p>
                            </div>
                            <h3 class="text-lg font-semibold mt-4">Content Overview</h3>
                            <ul class="list-disc list-inside">
                                <li v-for="section in sections" :key="section.id">
                                    <span class="capitalize font-medium">{{ section.type }}:</span> {{
                                        section.content.substring(0, 50) }}...
                                </li>
                            </ul>
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

                <!-- RIGHT SIDE: Live Preview / Final Website -->
                <div :class="isLive ? 'col-span-full' : 'col-span-2'" class="flex flex-col gap-6">
                    <div class="bread-container-bordered border transition-colors duration-500"
                        :style="{ 
                            backgroundColor: selectedPalette.colors.background, 
                            borderColor: selectedPalette.colors.surface,
                            fontFamily: `'${selectedFontPairing.bodyFont}'`,
                        }"
                        :class="isLive ? 'shadow-2xl max-w-4xl mx-auto w-full' : 'w-full'">
                        <div class="flex flex-col gap-8 text-center py-12 px-6 relative"
                            :style="{
                                backgroundImage: websiteData.headerImage ? `url(${websiteData.headerImage})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                                minHeight: websiteData.headerImage ? '250px' : 'auto', // Ensure image is visible
                            }">
                            <!-- Overlay for readability -->
                            <div v-if="websiteData.headerImage"
                                class="absolute inset-0 bg-black opacity-30 z-0 rounded-lg"></div>
                            <div class="relative z-10 space-y-4">

                            <div class="space-y-4">
                                <h1 class="text-4xl md:text-5xl font-bold leading-tight"
                                    :style="{ color: selectedPalette.colors.heading, fontFamily: `'${selectedFontPairing.headingFont}'` }">
                                    {{ websiteData.siteTitle || 'Your Site Title' }}
                                </h1>
                                <p class="text-lg" :style="{ color: selectedPalette.colors.text }">
                                    {{ websiteData.siteDescription || 'Your site description goes here.' }}
                                </p>
                                <div v-if="websiteData.domainName" class="text-sm"
                                    :style="{ color: selectedPalette.colors.primary }">
                                    {{ websiteData.domainName }}
                                </div>
                            </div>
                            </div>

                            <!-- Dynamic Content Sections Preview -->
                            <div class="flex flex-col gap-6 mt-8">
                                <div v-for="section in sections" :key="section.id">
                                    <h2 v-if="section.type === 'heading'" class="text-3xl font-bold"
                                        :style="{ color: selectedPalette.colors.heading, fontFamily: `'${selectedFontPairing.headingFont}'` }">
                                        {{ section.content }}
                                    </h2>
                                    <p v-else-if="section.type === 'paragraph'"
                                        class="prose max-w-none mx-auto text-center"
                                        :style="{ color: selectedPalette.colors.text }">
                                        {{ section.content }}
                                    </p>
                                </div>
                            </div>

                            <!-- Footer Area -->
                            <div class="mt-8 pt-8 border-t" :style="{ borderColor: selectedPalette.colors.primary }">
                                <p class="text-sm" :style="{ color: selectedPalette.colors.text }">
                                    Contact: {{ websiteData.contactEmail || 'N/A' }}
                                </p>
                                <p class="text-xs mt-2" :style="{ color: selectedPalette.colors.text, opacity: 0.7 }">
                                    Motif: {{ websiteData.motif }}
                                </p>
                            </div>

                        </div>
                    </div>
                </div>

            </UPageGrid>
        </UContainer>
    </div>
</template>

<style scoped>
/* Add any specific styles for WebsiteMaker here if needed */
</style>