Vue.component('range-slider', {
    props: {
        label: String,
        modelValue: Number,
        min: {
            type: Number,
            default: 0
        },
        max: {
            type: Number,
            default: 100
        },
        step: {
            type: Number,
            default: 1
        }
    },
    template: `
        <div class="control-row">
            <label>
                {{ label }}
                <span class="value-display">{{ modelValue }}</span>
            </label>
            <input 
                type="range"
                :min="min"
                :max="max"
                :step="step"
                :value="modelValue"
                @input="$emit('update:modelValue', Number($event.target.value))"
            >
        </div>
    `
});