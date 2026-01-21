<template>
	<div class="scroll-sequence container" ref="containerRef">
		<canvas class="scroll-sequence" ref="canvasRef" role="img" :aria-label="props.alt"></canvas>
		<!-- Fallback only img tag -->
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { ScrollSequenceEngine } from "@scroll-sequence/core";
import type { ScrollSequenceProps } from "@scroll-sequence/core";

const props = defineProps<ScrollSequenceProps>();
let scrollSequence: ScrollSequenceEngine;

const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

onMounted(() => {
	if (!canvasRef.value) {
		console.warn(`ScrollSequenceVue: selector did not return an HTMLCanvasElement`);
		return;
	}

	if (!containerRef.value) {
		console.warn(`ScrollSequenceVue: selector did not return an HTMLElement`);
		return;
	}

	scrollSequence = new ScrollSequenceEngine({
		...props,
		canvas: canvasRef.value,
		container: containerRef.value,
	});
});

onUnmounted(() => {
	scrollSequence?.destroy();
});
</script>
