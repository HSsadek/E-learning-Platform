const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    completedLessons: [{
        lessonIndex: Number,
        completedAt: {
            type: Date,
            default: Date.now
        }
    }],
    totalLessons: {
        type: Number,
        required: true
    },
    progressPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    lastAccessedAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Progress yüzdesini otomatik hesapla
progressSchema.pre('save', function(next) {
    if (this.totalLessons > 0) {
        this.progressPercentage = Math.round((this.completedLessons.length / this.totalLessons) * 100);
    }
    next();
});

module.exports = mongoose.model('Progress', progressSchema);