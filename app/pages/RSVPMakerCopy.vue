<template>
  <div class="container mx-auto p-4 md:p-8">
    
    <!-- Controls to add new blocks -->
    <div class="mb-8 flex gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
      <UButton 
        icon="i-heroicons-h1" 
        color="neutral" 
        variant="solid" 
        @click="addBlock('heading')"
      >
        Add Heading
      </UButton>
      <UButton 
        icon="i-heroicons-document-text" 
        color="neutral" 
        variant="solid" 
        @click="addBlock('text')"
      >
        Add Rich Text
      </UButton>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      
      <!-- LEFT SIDE: Dynamic Form Fields -->
      <div class="flex flex-col gap-6">
        <h2 class="text-2xl font-semibold">Content Blocks</h2>
        
        <div v-if="blocks.length === 0" class="text-gray-500 italic">
          No blocks added yet. Click a button above to start building.
        </div>
        
        <!-- Loop through our blocks array -->
        <UCard 
          v-for="(block, index) in blocks" 
          :key="block.id" 
          class="relative"
        >
          <template #header>
            <div class="flex justify-between items-center">
              <span class="font-medium text-sm text-gray-500 uppercase tracking-wider">
                {{ block.type === 'heading' ? 'Heading Block' : 'Rich Text Block' }}
              </span>
              
              <!-- Trash Button -->
              <UButton 
                icon="i-heroicons-trash" 
                color="error" 
                variant="ghost" 
                size="sm"
                @click="removeBlock(block.id)" 
                aria-label="Delete block"
              />
            </div>
          </template>

          <!-- Conditionally render the right input based on block.type -->
          <div v-if="block.type === 'heading'">
            <UInput 
              v-model="block.content" 
              placeholder="Type your heading..." 
              size="lg" 
            />
          </div>
          
          <div v-if="block.type === 'text'">
            <UEditor 
              v-model="block.content" 
              :starter-kit="{ heading: { levels: [1, 2, 3] } }"
              class="min-h-200px border border-gray-200 dark:border-gray-800 rounded-md"
            />
          </div>
        </UCard>
      </div>

      <!-- RIGHT SIDE: Dynamic Live Preview -->
      <div class="flex flex-col gap-6">
        <h2 class="text-2xl font-semibold">Live Preview</h2>
        
        <UCard class="h-full min-h-500px">
          
          <div v-if="blocks.length === 0" class="text-gray-400 dark:text-gray-500 italic">
            Your preview will appear here...
          </div>

          <div class="flex flex-col gap-6">
            <!-- Loop through the exact same array to generate the preview -->
            <div v-for="block in blocks" :key="`preview-${block.id}`">
              
              <!-- Render Heading Preview -->
              <h2 
                v-if="block.type === 'heading'" 
                class="text-3xl font-bold"
              >
                {{ block.content || 'Empty Heading' }}
              </h2>
              
              <!-- Render Rich Text Preview -->
              <div 
                v-if="block.type === 'text'"
                class="prose dark:prose-invert max-w-none" 
                v-html="block.content || '<p class=\'text-gray-400 italic\'>Empty text block...</p>'"
              ></div>
              
            </div>
          </div>
        </UCard>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Define the shape of our block objects
interface Block {
  id: string | number;
  type: 'heading' | 'text';
  content: string;
}

// State is now an array of blocks instead of a single object
const blocks = ref<Block[]>([
  { id: 1, type: 'heading', content: 'Welcome to the Page Builder' }
])

// Function to add a new block
const addBlock = (type: 'heading' | 'text') => {
  blocks.value.push({
    // Use Date.now() for a quick unique ID so Vue can track DOM elements properly
    id: Date.now(), 
    type,
    content: ''
  })
}

// Function to remove a block by its unique ID
const removeBlock = (id: string | number) => {
  blocks.value = blocks.value.filter(block => block.id !== id)
}
</script>