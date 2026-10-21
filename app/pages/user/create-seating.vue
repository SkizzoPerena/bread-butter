<script setup lang="ts">
import type { JamPackageRecord } from '~/types/seating'
import { getApiErrorMessage } from '~/types/auth'

definePageMeta({ layout: 'signed-in-navbar' })
useHead({ title: 'New seating plan - Bread + Butter' })

const toast = useToast()
const { listPackages, createGathering } = useSeating()

const packages = ref<JamPackageRecord[]>([])
const selectedId = ref('')
const name = ref('')
const venue = ref('')
const eventDate = ref('')
const loading = ref(true)
const saving = ref(false)

const selected = computed(() => packages.value.find((item) => item._id === selectedId.value) || null)

onMounted(async () => {
  try {
    packages.value = await listPackages()
    selectedId.value = packages.value[0]?._id || ''
  } catch (error) {
    toast.add({ title: 'Could not load packages', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    loading.value = false
  }
})

async function submit() {
  if (!selected.value) return
  if (!name.value.trim() || !venue.value.trim() || !eventDate.value) {
    toast.add({ title: 'Add the gathering details', description: 'Name, venue, and date are required.', color: 'warning' })
    return
  }
  saving.value = true
  try {
    const gathering = await createGathering({
      packageId: selected.value._id,
      name: name.value.trim(),
      venue: venue.value.trim(),
      eventDate: new Date(eventDate.value).toISOString(),
    })
    await navigateTo({ path: '/user/seating-payment', query: { gatheringId: gathering._id } })
  } catch (error) {
    toast.add({ title: 'Could not create seating plan', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="bg-toast-700 min-h-screen">
    <UContainer class="py-8 space-y-6 max-w-5xl">
      <div class="space-y-2 text-center">
        <h1 class="text-3xl font-bold font-serif text-bread-400">
          New seating plan
        </h1>
        <p class="text-sm text-white/90">
          Pick a jam package, then add the gathering. This does not include wedding planning tools.
        </p>
      </div>

      <div
        v-if="loading"
        class="text-center text-white"
      >
        Loading packages...
      </div>
      <div
        v-else-if="packages.length === 0"
        class="white-bread-container p-6 text-center"
      >
        No jam packages are available yet.
      </div>
      <form
        v-else
        class="space-y-6"
        @submit.prevent="submit"
      >
        <div class="grid gap-4 md:grid-cols-3">
          <button
            v-for="jamPackage in packages"
            :key="jamPackage._id"
            type="button"
            class="white-bread-container p-5 text-left space-y-2 border-2"
            :class="selectedId === jamPackage._id ? 'border-toast-700' : 'border-transparent'"
            @click="selectedId = jamPackage._id"
          >
            <p class="font-serif text-2xl font-bold">
              {{ jamPackage.name }}
            </p>
            <p class="text-sm">
              Up to {{ jamPackage.maxGuests }} guests
            </p>
            <p class="font-semibold">
              ₱{{ jamPackage.pricePhp.toLocaleString() }}
            </p>
          </button>
        </div>

        <div class="white-bread-container p-5 space-y-4">
          <UFormField
            label="Gathering name"
            required
          >
            <UInput
              v-model="name"
              class="w-full"
              placeholder="Santos reunion"
            />
          </UFormField>
          <UFormField
            label="Venue"
            required
          >
            <UInput
              v-model="venue"
              class="w-full"
              placeholder="The garden hall"
            />
          </UFormField>
          <UFormField
            label="Date"
            required
          >
            <UInput
              v-model="eventDate"
              type="date"
              class="w-full"
            />
          </UFormField>
          <UButton
            type="submit"
            block
            :loading="saving"
            :disabled="!selected"
          >
            Continue to payment
          </UButton>
        </div>
      </form>
    </UContainer>
  </div>
</template>
