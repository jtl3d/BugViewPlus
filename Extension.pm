# -*- Mode: perl; indent-tabs-mode: nil -*-
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (C) 2012 Jolla Ltd.
# Contact: Pami Ketolainen <pami.ketolainen@jollamobile.com>

package Bugzilla::Extension::BugViewPlus;
use strict;
use base qw(Bugzilla::Extension);

use Bugzilla::Field qw(get_legal_field_values);
use Bugzilla::Group;
use Bugzilla::Template;
use Bugzilla::Util qw(detaint_natural trick_taint);

our $VERSION = '0.01';

sub install_update_db {
    my ($self, $args) = @_;
    my $edit_desc_group = Bugzilla::Group->new({
            name => "bvp_edit_description"
        });
    if (! defined $edit_desc_group) {
        Bugzilla::Group->create({
                name => "bvp_edit_description",
                description => "Users who can edit bug descriptions",
            });
    }
}

sub config_add_panels {
    my ($self, $args) = @_;
    my $modules = $args->{panel_modules};
    $modules->{BugViewPlus} = "Bugzilla::Extension::BugViewPlus::Params";
}

sub bug_end_of_update {
    my ($self, $args) = @_;
    my $cgi = Bugzilla->cgi;
    my $dbh = Bugzilla->dbh;
    my ($bug, $timestamp) = @$args{qw(bug timestamp)};

    # Get the bug id passed to processbug.cgi
    my $bug_id = $cgi->param('id');
    return unless $bug_id;
    return unless detaint_natural($bug_id);
    
    # Make sure we are udating the same bug and not some related bug
    if ($bug->bug_id == $bug_id) {

        # Edit description related stuff
        if (Bugzilla->user->in_group('bvp_edit_description')) {
            # Current description text
            my $old_desc = ${ @{ $bug->comments }[0] }{'thetext'};

            # Current descriptions comment id (in longdescs table)
            my $comment_id = ${ @{ $bug->comments }[0] }{'comment_id'};

            # The new description
            my $new_desc = $cgi->param('bvp_description');

            if ($new_desc) {
                trick_taint($new_desc);

                # Remove trailing whitespace
                $new_desc =~ s/\s*$//s;
                $new_desc =~ s/\r\n?/\n/g;    # Get rid of \r.

                if ($old_desc ne $new_desc) {
                    # Add or update the timestamp in description
                    my $stamp = "> Edited by ".Bugzilla->user->name." on ".$timestamp;
                    if (! ($new_desc =~ s/> Edited by .* on .*$/$stamp/)) {
                        $new_desc .= "\n\n".$stamp;
                    }
                    # Push to database
                    $dbh->do('UPDATE longdescs SET thetext = ? '.
                              'WHERE bug_id = ? AND comment_id = ?',
                            undef, $new_desc, $bug->bug_id, $comment_id);
                }
            }
        }
    }
}

sub bug_format_comment {
    my ($self, $args) = @_;
    my $regexes = $args->{regexes};

    # Turn '<severity> #' into bug link in comments
    if (!defined $self->{bug_severities}) {
        $self->{bug_severities} = get_legal_field_values('bug_severity');
    }
    foreach my $value (@{$self->{bug_severities}}) {
        push (@$regexes, { match => qr/($value)\s*(\d+)/i,
                replace => \&_replace_bug_link } );
    }
}

sub _replace_bug_link {
    my $args = shift;
    my $type = $args->{matches}->[0];
    my $id = $args->{matches}->[1];

    return Bugzilla::Template::get_bug_link($id, $type." ".$id);
}

__PACKAGE__->NAME;
