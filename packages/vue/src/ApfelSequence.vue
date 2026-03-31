<template>
	<div class="apfel-container" ref="containerRef">
		<canvas class="apfel-sequence" ref="canvasRef" role="img" :aria-label="props.alt"></canvas>
	</div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { ApfelSequenceEngine } from "@apfel-sequence/core";
import type { ApfelSequenceProps } from "@apfel-sequence/core";

const props = defineProps<ApfelSequenceProps>();
let apfelSequence: ApfelSequenceEngine;

const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

onMounted(() => {
	if (!canvasRef.value) {
		console.warn(`ApfelSequenceVue: selector did not return an HTMLCanvasElement`);
		return;
	}

	if (!containerRef.value) {
		console.warn(`ApfelSequenceVue: selector did not return an HTMLElement`);
		return;
	}

	apfelSequence = new ApfelSequenceEngine({
		...props,
		canvas: canvasRef.value,
		container: containerRef.value,
	});
});

watch(props, (newProps) => {
	if (apfelSequence) {
		apfelSequence.updateConfig(newProps);
	}
}, { deep: true });

onUnmounted(() => {
	apfelSequence?.destroy();
});
</script>
