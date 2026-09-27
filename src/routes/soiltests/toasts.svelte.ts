export type ToastVariant = 'success' | 'error' | 'warning';
export type Toast = { id: number; message: string; variant: ToastVariant };

export class Toaster {
	items = $state<Toast[]>([]);

	#next = 0;
	#timers: Record<number, ReturnType<typeof setTimeout>> = {};

	show(message: string, variant: ToastVariant = 'success') {
		const id = ++this.#next;
		this.items.push({ id, message, variant });
		this.#timers[id] = setTimeout(() => this.dismiss(id), 5000);
	}

	dismiss(id: number) {
		clearTimeout(this.#timers[id]);
		delete this.#timers[id];
		this.items = this.items.filter((toast) => toast.id !== id);
	}

	destroy() {
		for (const timer of Object.values(this.#timers)) clearTimeout(timer);
		this.#timers = {};
	}
}
