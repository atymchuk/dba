/**
 * Base Form for inheritance
 */
Ext.define('SM.view.base.BaseForm', {
    extend: 'Ext.form.Panel',
    xtype: 'base.form',

    mixins: ['SM.core.Localizable'],
    localizable: {
        delRecordTitle: 'Delete record',
        unsavedCloseConfirm: [
            'There are unsaved changes in this form.',
            ' Are you sure you want to close it?'
        ].join(''),
        recordSaved: 'Record saved',
        cantSaveRecord: 'Record cannot be saved',
        recordDeleted: 'Record successfully deleted',
        cantDeleteRecord: 'This record cannot be deleted',
        beforeDeleteConfirm: 'Are you sure you want to delete this record?',
        invalidForm: 'The form is not valid',
        formNotChanged: 'No changes to save'
    },
    // auto getters & setters
    config: {
        entityName: null,
        recordId: null
    },

    title: 'Base Form',
    bodyPadding: 15,
    width: '100%',
    scrollable: true,
    trackResetOnLoad: true,
    // closeAction: 'destroy',
    // closable: false,

    jsonSubmit: true,
    url: 'api/v1',

    defaults: {
        anchor: '100%',
        labelSeparator: ''
    },

    dockedItems: [
        {
            xtype: 'toolbar',
            dock: 'top',
            ui: 'footer',
            items: [
                {
                    text: 'Back',
                    iconCls: 'fa fa-arrow-circle-left',
                    handler: function() {
                        this.up('form').close();
                    }
                },
                {
                    text: 'Save & close',
                    itemId: 'saveCloseBtn',
                    disabled: true,
                    iconCls: 'fa fa-floppy-o',
                    handler: function() {
                        var form = this.up('form');
                        if (form.fireEvent('beforesave', form) === false) {
                            SM.core.Toast(form.localize('cantSaveRecord'));
                            return;
                        }
                        form.onSave(form)
                        .then(function(response) {
                            SM.core.Toast(response.msg || form.localize('recordSaved'));
                            form.resetDirty();
                            form.fireEvent('aftersave', 'close');
                        })
                        .catch(function(err) {
                            Ext.Msg.alert('Information', err || 'Unknown server error');
                        });
                    }
                },
                {
                    text: 'Save',
                    itemId: 'saveBtn',
                    iconCls: 'fa fa-floppy-o',
                    disabled: true,
                    handler: function() {
                        var form = this.up('form');
                        if (form.fireEvent('beforesave', form) === false) {
                            SM.core.Toast(form.localize('cantSaveRecord'));
                            return;
                        }
                        form.onSave(form)
                        .then(function(response) {
                            SM.core.Toast(response.msg || form.localize('recordSaved'));
                            form.resetDirty();
                            form.fireEvent('aftersave');
                        })
                        .catch(function(err) {
                            Ext.Msg.alert('Information', err || 'Unknown server error');
                        });
                    }
                },
                {
                    text: 'Copy',
                    itemId: 'copyBtn',
                    iconCls: 'fa fa-plus-circle',
                    disabled: true,
                    handler: function() {
                        var form = this.up('form');
                        form.setRecordId(null);
                        form.getForm().findField('Id').setValue(null);
                        form.fireEvent('dirtychange');
                    }
                },
                {
                    text: 'Delete',
                    itemId: 'deleteBtn',
                    iconCls: 'fa fa-minus-circle',
                    disabled: true,
                    handler: function() {
                        var form = this.up('form');
                        if (form.fireEvent('beforedelete', form) === false) {
                            return SM.core.Toast(form.localize('cantDeleteRecord'));
                        }
                        form.onDelete(form)
                        .then(function(response) {
                            form.fireEvent('afterdelete');
                            SM.core.Toast(response.msg || form.localize('recordDeleted'));
                            form.forceClose();

                        })
                        .catch(function(message) {
                            if (message)
                                SM.core.Toast(message);
                        });
                    }
                },
                {
                    xtype: 'tbtext',
                    text: 'New',
                    itemId: 'newLabel',
                    hidden: true,
                    style: {
                        color: 'maroon'
                    }
                }
            ]
        }
    ],

    listeners: {
        // beforeclose:
    },
    /**
     * @method resetDirty Resets the form's dirty state
     * Use to avoid false positive dirty state after loading form values
     * @returns {void}
     */
    resetDirty: function() {
        this.getForm().getFields().each(function(fld) {
            // fld.originalValue = fld.getValue();
            fld.resetOriginalValue();
        });
        this.getForm().checkDirty();
    },
    /**
     * @method forceClose Allows to close the form by ignoring its dirty status
     * @returns {void}
     */
    forceClose: function() {
        this.resetDirty();
        this.close();
    },
    /**
     * @method onSave Persists the form's field values to the database
     * @param {Object} form The form instance
     * @returns {Promise} The promise will return the server's response
     */
    onSave: function(form) {
        var $form = form.getForm();
        var isNew = !this.getRecordId();
        var values = $form.getFieldValues(!isNew);
        return new Promise(function(resolve, reject) {
            if (!$form.isValid()) {
                $form.getFields().each(function(field) {
                    if (!field.isValid())
                        console.log('field', field.name || field);
                });
                reject(form.localize('invalidForm'));
            }
            else if (!Object.keys(values).length) {
                reject(form.localize('formNotChanged'));
            }
            else {
                var recordId = form.getRecordId();
                var action = recordId ? 'update' : 'create';
                var params = {
                    entity: form.getEntityName(),
                    action: action,
                    values: values,
                    query: {
                        where: {
                            Id: recordId
                        }
                    }
                };
                if (!recordId) {
                    // new record has no recordId and must have no query
                    delete params.query;
                }
                // console.log('values:', values);
                resolve(SM.Request.create({
                    params: params
                }));
            }
        });
    },
    /**
     * @method onDelete Deletes a form's record from the database
     * @param {Object} form The form instance
     * @returns {Promise} The promise will return the server's response
     */
    onDelete: function(form) {
        return new Promise(function(resolve, reject) {
            Ext.Msg.show({
                title: form.localize('delRecordTitle'),
                message: form.localize('beforeDeleteConfirm'),
                buttons: Ext.Msg.YESNOCANCEL,
                icon: Ext.Msg.QUESTION,
                fn: function(btn) {
                    if (btn === 'yes') {
                        resolve(SM.Request.create({
                            params: {
                                entity: form.getEntityName(),
                                action: 'remove',
                                query: {
                                    where: {
                                        Id: form.getRecordId()
                                    }
                                }
                            }
                        }));
                    }
                    else {
                        reject('' /* show no message */);
                    }
                }
            });
        });
    },
    /**
     * @method loadFieldStores Loads comboboxes' stores
     * @returns {void}
     */
    loadFieldStores: function() {
        this.suspendEvent('dirtychange');
        this.items.each(function(item) {
            if (/^combobox/.test(item.xtype) && item.store) {
                item.store.load();
            }
        });
        this.resumeEvent('dirtychange');
    }
});
