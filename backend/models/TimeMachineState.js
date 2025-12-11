// backend/models/TimeMachineState.js
// Lưu trạng thái Time Machine vào MongoDB để sync giữa các server instances

const mongoose = require('mongoose');

const timeMachineStateSchema = new mongoose.Schema({
    // Chỉ có 1 document duy nhất với key này
    key: {
        type: String,
        default: 'time_machine_state',
        unique: true,
        required: true
    },

    // Offset tính bằng milliseconds
    timeOffset: {
        type: Number,
        default: 0
    },

    // Thời gian virtual được set
    virtualTime: {
        type: Date,
        default: null
    },

    // Thời gian thực khi set
    realTimeWhenSet: {
        type: Date,
        default: null
    },

    // Ai đã set
    setBy: {
        type: String,
        default: null
    },

    // Thời gian cập nhật cuối
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Đảm bảo chỉ có 1 document
timeMachineStateSchema.statics.getState = async function () {
    let state = await this.findOne({ key: 'time_machine_state' });
    if (!state) {
        state = await this.create({ key: 'time_machine_state', timeOffset: 0 });
    }
    return state;
};

timeMachineStateSchema.statics.setOffset = async function (offset, virtualTime, setBy) {
    const state = await this.findOneAndUpdate(
        { key: 'time_machine_state' },
        {
            timeOffset: offset,
            virtualTime: virtualTime,
            realTimeWhenSet: new Date(),
            setBy: setBy,
            updatedAt: new Date()
        },
        { upsert: true, new: true }
    );
    return state;
};

timeMachineStateSchema.statics.resetOffset = async function () {
    const state = await this.findOneAndUpdate(
        { key: 'time_machine_state' },
        {
            timeOffset: 0,
            virtualTime: null,
            realTimeWhenSet: null,
            setBy: null,
            updatedAt: new Date()
        },
        { upsert: true, new: true }
    );
    return state;
};

module.exports = mongoose.model('TimeMachineState', timeMachineStateSchema);
