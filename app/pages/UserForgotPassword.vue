<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const toast = useToast()

const schema = z.object({
    email: z.string().email('Invalid email'),
})

type Schema = z.output<typeof schema>

const state = reactive({
    email: '',
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
    console.log('Submitted', event.data)
    toast.add({ title: 'Password reset email sent', description: 'Check your inbox for a link to reset your password.' })
    await navigateTo('/UserLogin')
}

</script>

<template>
    <div class="flex items-center justify-center p-4 bpb-pattern h-screen">
        <UPageCard class="bread-container w-full max-w-md ring ring-transparent p-2 sm:p-4 bg-bread-200">
            <div class="gap-8">
                <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">

                    <div class="text-left text-sm text-muted mt-1 mb-6">
                        <div class="text-xl font-serif font-semibold text-toast-700">Forgot your password?</div>
                        Enter your email and we'll send you a link to reset it.
                    </div>

                    <UFormField label="Email" name="email" required>
                        <UInput class="w-full" v-model="state.email" placeholder="Enter your email" />
                    </UFormField>
                    <UButton type="submit" block>Send reset link</UButton>
                    <div class="text-sm text-center mt-1">
                        Remembered your password? <ULink to="/UserLogin" class="text-primary font-medium">Sign in
                        </ULink> instead.
                    </div>
                </UForm>
            </div>
        </UPageCard>
    </div>
</template>

<style>
</style>