<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import axios from 'axios';
import { useField, useForm } from 'vee-validate';
import { useRouter } from 'vue-router';

import { type CreateGame, CreateGameScheme } from '@/contracts';

const router = useRouter();

const loginSchema = toTypedSchema(CreateGameScheme);

const { handleSubmit, errors } = useForm({
  validationSchema: loginSchema
});

const { value: height } = useField<number>('height', undefined, { initialValue: 5 });
const { value: width } = useField<number>('width', undefined, { initialValue: 5 });
const { value: gemQuantity } = useField<number>('gemQuantity', undefined, { initialValue: 5 });

const startGame = handleSubmit(async (dto: CreateGame) => {
  const response = await axios.post<string>(`http://localhost:4005/game/`, dto);

  router.push(`/game/${response.data}`);
});
</script>

<template>
  <main class="flex flex-col items-center justify-center flex-grow gap-5">
    <h1 class="text-3xl">Create new game or join by game id</h1>
    <form
      class="bg-black flex flex-col gap-5 rounded-xl p-10 min-w-96"
      @submit="startGame"
    >
      <div class="flex flex-col gap-5 rounded-md">
        <label for="height">Height</label>
        <input
          class="rounded-md bg-slate-800 hover:bg-slate-700 text-white py-2 px-4"
          name="height"
          v-model="height"
          value="5"
          type="number"
        />
        <div class="text-red-400">{{ errors.height }}</div>
      </div>

      <div class="flex flex-col gap-5 rounded-md">
        <label for="width">Width</label>
        <input
          class="rounded-md bg-slate-800 hover:bg-slate-700 text-white py-2 px-4"
          v-model="width"
          value="5"
          type="number"
        />
        <div class="text-red-400">{{ errors.width }}</div>
      </div>

      <div class="flex flex-col gap-5 rounded-md">
        <label for="gemQuantity">Gem Quantity</label>
        <input
          class="rounded-md bg-slate-800 hover:bg-slate-700 text-white py-2 px-4"
          v-model="gemQuantity"
          value="3"
          type="number"
        />
        <div class="text-red-400">{{ errors.gemQuantity }}</div>
      </div>

      <button class="rounded-md bg-slate-800 hover:bg-slate-700 text-white py-2 px-4">
        Start new game
      </button>
    </form>
  </main>
</template>
