Vue.component('settings-group', {
    props: {
        title: String
    },
    template: `
        <div class="settings-group">
            <div class="settings-group-title">{{ title }}</div>
            <slot></slot>
        </div>
    `
});