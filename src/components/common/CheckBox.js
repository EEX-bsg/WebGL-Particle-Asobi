Vue.component('check-box', {
    props: {
        label: String,
        modelValue: Boolean
    },
    template: `
        <div class="control-row">
            <label>
                {{ label }}
                <input 
                    type="checkbox"
                    :checked="modelValue"
                    @change="$emit('update:modelValue', $event.target.checked)"
                >
            </label>
        </div>
    `
});